import { Router } from 'express';
import { queryOne } from '../db/helpers.js';

export const overlayRouter = Router();

overlayRouter.get('/live', (req, res) => {
  const stream = queryOne('SELECT * FROM streams WHERE status = ? ORDER BY created_at DESC LIMIT 1', ['active']) as any;
  if (!stream) return res.status(404).send('No hay stream activo');

  const params = req.query;
  const barHeight = parseInt(params.barHeight as string) || 38;
  const showNames = params.showNames !== 'false';
  const showTotal = params.showTotal !== 'false';
  const showHeader = params.showHeader !== 'false';
  const fontSize = parseInt(params.fontSize as string) || 20;
  const maxDisplay = parseInt(params.max as string) || stream.max_pilots_display || 10;
  const chromaKey = params.chromaKey === 'true';
  const bgColor = chromaKey ? '#00FF00' : 'transparent';
  const mode = (params.mode as string) || 'votes';

  res.send(getUnifiedOverlayHtml(stream, { barHeight, showNames, showTotal, showHeader, fontSize, maxDisplay, chromaKey, bgColor, mode }));
});

overlayRouter.get('/:id', (req, res) => {
  const stream = queryOne('SELECT * FROM streams WHERE id = ?', [req.params.id]) as any;
  if (!stream) return res.status(404).send('Stream no encontrado');

  const params = req.query;
  const barHeight = parseInt(params.barHeight as string) || 38;
  const showNames = params.showNames !== 'false';
  const showTotal = params.showTotal !== 'false';
  const showHeader = params.showHeader !== 'false';
  const fontSize = parseInt(params.fontSize as string) || 20;
  const maxDisplay = parseInt(params.max as string) || stream.max_pilots_display || 10;
  const chromaKey = params.chromaKey === 'true';
  const bgColor = chromaKey ? '#00FF00' : 'transparent';
  const mode = (params.mode as string) || 'votes';

  res.send(getUnifiedOverlayHtml(stream, { barHeight, showNames, showTotal, showHeader, fontSize, maxDisplay, chromaKey, bgColor, mode }));
});

function getUnifiedOverlayHtml(stream: any, opts: {
  barHeight: number;
  showNames: boolean;
  showTotal: boolean;
  showHeader: boolean;
  fontSize: number;
  maxDisplay: number;
  chromaKey: boolean;
  bgColor: string;
  mode: string;
}): string {
  const isPredictions = opts.mode === 'predictions';
  const isWinners = opts.mode === 'winners';
  const headerIcon = isPredictions ? '🎯' : '🏁';
  const headerTitle = isPredictions ? 'PREDI<span class="highlight">CTIONS</span>' : 'BETO<span class="red">CAST</span>';
  const headerSubtitle = isPredictions ? '¿Quién ganará?' : 'Live Poll';
  const emptyIcon = isPredictions ? '🔮' : '🏁';
  const emptyText = isPredictions ? 'Esperando predicciones...' : 'Esperando votos...';
  const hintHtml = isPredictions
    ? '<div class="hint-bar">Predice con <code>!gana #numero</code></div>'
    : '<div class="hint-bar">¿Quieres votar? Escribe en el chat <strong>#</strong> + número de tu piloto</div>';
  const countLabel = isPredictions ? 'predicciones' : 'votos';
  const footerStatLabel = isPredictions ? 'participantes' : 'votos';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BetoCast - ${stream.title || stream.id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${opts.bgColor};
      color: white;
      min-height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      padding: 24px 32px;
      max-width: 920px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* ── Main Panel ── */
    .panel {
      background: #0b2467;
      border-radius: 16px;
      padding: 28px 36px 24px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.08);
      animation: fadeSlideDown 0.6s ease-out;
    }

    /* ── Logo ── */
    .logo-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 20px;
    }
    .logo-bar img {
      height: 56px;
      width: 56px;
    }
    .logo-bar .brand {
      font-size: 34px;
      font-weight: 900;
      font-style: italic;
      letter-spacing: 2px;
      color: #ffffff;
    }
    .logo-bar .brand .red { color: #CC2020; }
    .logo-bar .brand .highlight { color: #a855f7; }
    .logo-bar .subtitle {
      font-size: 18px;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* ── Chart ─ */
    .chart { display: flex; flex-direction: column; gap: 10px; width: 100%; }

    /* ─ Bar Row ─ */
    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
      transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
      will-change: transform;
    }
    .bar-rank {
      width: 32px;
      font-size: 18px;
      font-weight: 900;
      color: rgba(255,255,255,0.7);
      text-align: center;
    }
    .bar-rank.top-1 { color: #fbbf24; }
    .bar-rank.top-2 { color: #9ca3af; }
    .bar-rank.top-3 { color: #d97706; }
    .bar-number {
      width: 56px;
      font-size: ${opts.fontSize + 4}px;
      font-weight: 900;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .bar-track {
      flex: 1;
      height: ${opts.barHeight}px;
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      border: 2px solid rgba(255,255,255,0.08);
    }
    .bar-fill {
      height: 100%;
      border-radius: 6px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
      min-width: 0;
    }
    .bar-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 100%);
      border-radius: 6px;
    }
    .bar-fill .count-inside {
      font-size: 20px;
      font-weight: 900;
      color: #ffffff;
      position: relative;
      z-index: 1;
      font-variant-numeric: tabular-nums;
    }
    .bar-info { display: flex; flex-direction: column; width: 120px; gap: 2px; text-align: right; }
    .bar-driver {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bar-count {
      font-size: 16px;
      font-weight: 700;
      color: rgba(255,255,255,0.8);
      font-variant-numeric: tabular-nums;
    }

    /* ── Hint ── */
    .hint-bar {
      text-align: center;
      margin-top: 20px;
      padding: 10px 20px;
      background: rgba(255,255,255,0.08);
      border-radius: 10px;
      font-size: 17px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
      line-height: 1.5;
    }
    .hint-bar strong {
      color: #CC2020;
      font-weight: 900;
      font-size: 20px;
    }
    .hint-bar code {
      background: rgba(168,85,247,0.35);
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 800;
      color: #e9d5ff;
    }

    /* ── Footer ─ */
    .footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 18px;
      font-weight: 700;
      color: rgba(255,255,255,0.75);
      animation: fadeIn 0.8s ease-out;
      width: 100%;
    }
    .footer .stat { display: flex; align-items: center; gap: 6px; }
    .footer .stat strong { color: #ffffff; font-weight: 900; font-size: 22px; }

    /* ── Empty state ── */
    .empty { text-align: center; padding: 40px 30px; color: rgba(255,255,255,0.35); }
    .empty .icon { font-size: 40px; margin-bottom: 12px; }
    .empty p { font-size: 18px; font-weight: 700; }

    /* ── Winners ── */
    .winners {
      text-align: center;
      padding: 20px;
      margin-top: 20px;
      background: rgba(168,85,247,0.15);
      border: 1px solid rgba(168,85,247,0.3);
      border-radius: 12px;
      animation: fadeIn 0.6s ease-out;
      width: 100%;
    }
    .winners .trophy { font-size: 48px; margin-bottom: 8px; }
    .winners .title {
      font-size: 22px;
      font-weight: 900;
      color: #c084fc;
      margin-bottom: 14px;
    }
    .winners .list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }
    .winners .winner {
      background: rgba(168,85,247,0.25);
      border: 1px solid rgba(168,85,247,0.4);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 15px;
      font-weight: 700;
      color: white;
    }

    /* ─ Animations ── */
    .flash .bar-fill { animation: barFlash 0.6s ease-out; }
    @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes barFlash { 0% { filter: brightness(1.6) saturate(1.3); } 100% { filter: brightness(1) saturate(1); } }

    #debug {
      position: fixed;
      top: 4px;
      right: 4px;
      font-size: 10px;
      color: rgba(255,255,255,0.3);
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div id="debug"></div>
  <div class="container">
    <div class="panel">
      <div class="logo-bar">
        <img src="/logo.svg" alt="Beto Casting" />
        <div>
          <div class="brand">${headerTitle}</div>
          <div class="subtitle">${headerSubtitle}</div>
        </div>
      </div>

      <div class="chart" id="chart">
        <div class="empty"><div class="icon">${emptyIcon}</div><p>${emptyText}</p></div>
      </div>

      <div style="text-align:center">
        ${hintHtml}
      </div>

      ${opts.showTotal ? '<div class="footer" id="footer"></div>' : ''}
      <div id="winners-container"></div>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    var streamId = '${stream.id}';
    var maxDisplay = ${opts.maxDisplay};
    var showNames = ${opts.showNames};
    var mode = '${opts.mode}';
    var currentData = [];
    var counts = {};
    var colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e',
      '#14b8a6', '#a855f7', '#f59e0b', '#10b981', '#6366f1'
    ];
    var predictColors = [
      '#a855f7', '#ec4899', '#8b5cf6', '#d946ef', '#f43f5e',
      '#6366f1', '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#14b8a6', '#06b6d4', '#3b82f6', '#84cc16', '#10b981'
    ];
    var isPredictions = mode === 'predictions' || mode === 'winners';
    var colorList = isPredictions ? predictColors : colors;
    var countLabel = '${countLabel}';
    var apiEndpoint = isPredictions ? '/predictions' : '/votes';

    function debug(msg) {
      var el = document.getElementById('debug');
      if (el) el.textContent = msg;
    }

    function getColor(i) { return colorList[i % colorList.length]; }
    function getRankClass(i) {
      if (i === 0) return 'top-1';
      if (i === 1) return 'top-2';
      if (i === 2) return 'top-3';
      return '';
    }

    function renderChart(flashCars) {
      flashCars = flashCars || [];
      var container = document.getElementById('chart');
      if (currentData.length === 0) {
        container.innerHTML = '<div class="empty"><div class="icon">${emptyIcon}</div><p>${emptyText}</p></div>';
        return;
      }
      var maxCount = Math.max.apply(null, currentData.map(function(d) { return d.count; }));
      if (maxCount < 1) maxCount = 1;

      var html = '';
      for (var i = 0; i < currentData.length; i++) {
        var item = currentData[i];
        var pct = Math.max((item.count / maxCount) * 100, 2);
        var color = item.color || getColor(i);
        var isFlash = flashCars.indexOf(item.car_number) !== -1;
        var rankClass = getRankClass(i);
        var countInside = pct > 20 ? '<span class="count-inside">' + item.count + '</span>' : '';
        var displayName = item.driver_name ? item.driver_name : '';
        var rightSide = showNames
          ? '<div class="bar-info"><div class="bar-driver">' + displayName + '</div><div class="bar-count">' + item.count + ' ' + countLabel + '</div></div>'
          : '<div class="bar-count" style="width:60px;text-align:center">' + item.count + '</div>';

        html += '<div class="bar-row' + (isFlash ? ' flash' : '') + '">' +
          '<div class="bar-rank ' + rankClass + '">' + (i + 1) + '</div>' +
          '<div class="bar-number" style="color:' + color + '">#' + item.car_number + '</div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '">' + countInside + '</div></div>' +
          rightSide + '</div>';
      }
      container.innerHTML = html;
    }

    function updateFooter(total, totalUsers) {
      var footer = document.getElementById('footer');
      if (footer) {
        if (isPredictions) {
          footer.innerHTML = '<span class="stat"><strong>' + totalUsers + '</strong> participantes</span>' +
            '<span class="stat"><strong>' + total + '</strong> ' + countLabel + '</span>';
        } else {
          footer.innerHTML = '<span class="stat"><strong>' + total + '</strong> ' + countLabel + '</span>';
        }
      }
    }

    function showWinners(winners, carNumber) {
      var container = document.getElementById('winners-container');
      if (!container) return;
      if (!winners || winners.length === 0) {
        container.innerHTML = '';
        return;
      }

      var html = '<div class="winners">' +
        '<div class="trophy">🏆</div>' +
        '<div class="title">¡Ganadores - #' + carNumber + '!</div>' +
        '<div class="list">';

      winners.forEach(function(w) {
        html += '<span class="winner">' + (w.user_name || w.user_id) + '</span>';
      });

      html += '</div></div>';
      container.innerHTML = html;
    }

    function loadInitial() {
      debug('loading ' + mode + '...');
      fetch('/api/streams/' + streamId + apiEndpoint)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var results = data.results || [];
          var stats = data.stats || {};
          debug('loaded: ' + (stats.totalVotes || stats.totalPredictions || 0) + ' ' + countLabel);
          currentData = results.slice(0, maxDisplay);
          currentData.forEach(function(r) { counts[r.car_number] = r.count; });
          renderChart([]);
          if (isPredictions) {
            updateFooter(stats.totalPredictions, stats.totalPredictors);
          } else {
            updateFooter(stats.totalVotes, stats.totalVoters);
          }
          connectSocket();
        })
        .catch(function(err) {
          debug('fetch error: ' + err.message);
          connectSocket();
        });
    }

    function connectSocket() {
      if (typeof io === 'undefined') {
        debug('no socket.io - polling');
        startPolling();
        return;
      }

      debug('connecting socket...');
      var socket = io();
      socket.on('connect', function() {
        debug('ws connected');
        socket.emit('join-stream', streamId);
        debug('joined stream: ' + streamId);
      });

      if (isPredictions) {
        socket.on('prediction-update', function(data) {
          if (data.streamId !== streamId) return;
          var flashCars = [];
          data.results.slice(0, maxDisplay).forEach(function(r) {
            var old = counts[r.car_number] || 0;
            if (r.count > old) flashCars.push(r.car_number);
            counts[r.car_number] = r.count;
          });
          currentData = data.results.slice(0, maxDisplay);
          renderChart(flashCars);
        });

        socket.on('prediction-stats-update', function(data) {
          if (data.streamId !== streamId) return;
          updateFooter(data.stats.totalPredictions, data.stats.totalPredictors);
        });

        socket.on('predictions-resolved', function(data) {
          if (data.streamId !== streamId) return;
          showWinners(data.winners, data.carNumber);
        });
      } else {
        socket.on('vote-update', function(data) {
          if (data.streamId !== streamId) return;
          var flashCars = [];
          data.results.slice(0, maxDisplay).forEach(function(r) {
            var old = counts[r.car_number] || 0;
            if (r.count > old) flashCars.push(r.car_number);
            counts[r.car_number] = r.count;
          });
          currentData = data.results.slice(0, maxDisplay);
          renderChart(flashCars);
        });

        socket.on('stats-update', function(data) {
          if (data.streamId !== streamId) return;
          updateFooter(data.stats.totalVotes, data.stats.totalVoters);
        });
      }

      socket.on('disconnect', function() {
        debug('ws disconnected - polling');
        startPolling();
      });
    }

    var pollInterval = null;
    function startPolling() {
      if (pollInterval) return;
      pollInterval = setInterval(function() {
        fetch('/api/streams/' + streamId + apiEndpoint)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var results = data.results || [];
            var stats = data.stats || {};
            var flashCars = [];
            results.slice(0, maxDisplay).forEach(function(r) {
              var old = counts[r.car_number] || 0;
              if (r.count > old) flashCars.push(r.car_number);
              counts[r.car_number] = r.count;
            });
            currentData = results.slice(0, maxDisplay);
            renderChart(flashCars);
            if (isPredictions) {
              updateFooter(stats.totalPredictions, stats.totalPredictors);
            } else {
              updateFooter(stats.totalVotes, stats.totalVoters);
            }
            debug('poll ok: ' + (stats.totalVotes || stats.totalPredictions || 0) + ' ' + countLabel);
          })
          .catch(function() { debug('poll error'); });
      }, 3000);
    }

    loadInitial();
  </script>
</body>
</html>`;
}
