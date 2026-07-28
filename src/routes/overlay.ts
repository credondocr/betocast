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

  res.send(getOverlayHtml(stream, { barHeight, showNames, showTotal, showHeader, fontSize, maxDisplay, chromaKey, bgColor }));
});

overlayRouter.get('/predict', (req, res) => {
  const stream = queryOne('SELECT * FROM streams WHERE status = ? ORDER BY created_at DESC LIMIT 1', ['active']) as any;
  if (!stream) return res.status(404).send('No hay stream activo');

  const params = req.query;
  const barHeight = parseInt(params.barHeight as string) || 38;
  const showNames = params.showNames !== 'false';
  const fontSize = parseInt(params.fontSize as string) || 20;
  const maxDisplay = parseInt(params.max as string) || stream.max_pilots_display || 10;
  const chromaKey = params.chromaKey === 'true';
  const bgColor = chromaKey ? '#00FF00' : 'transparent';

  res.send(getPredictOverlayHtml(stream, { barHeight, showNames, fontSize, maxDisplay, chromaKey, bgColor }));
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

  res.send(getOverlayHtml(stream, { barHeight, showNames, showTotal, showHeader, fontSize, maxDisplay, chromaKey, bgColor }));
});

function getOverlayHtml(stream: any, opts: {
  barHeight: number;
  showNames: boolean;
  showTotal: boolean;
  showHeader: boolean;
  fontSize: number;
  maxDisplay: number;
  chromaKey: boolean;
  bgColor: string;
}): string {
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
      padding: 20px 30px;
      max-width: 700px;
      width: 100%;
    }

    /* ── Logo ── */
    .logo-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
      animation: fadeSlideDown 0.6s ease-out;
    }
    .logo-bar img {
      height: 48px;
      width: 48px;
    }
    .logo-bar .brand {
      font-size: 28px;
      font-weight: 900;
      font-style: italic;
      letter-spacing: 2px;
      color: #ffffff;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5);
    }
    .logo-bar .brand .red { color: #CC2020; }
    .logo-bar .subtitle {
      font-size: 14px;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* ── Chart ── */
    .chart { display: flex; flex-direction: column; gap: 10px; width: 100%; }

    /* ── Bar Row ── */
    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
      transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
      will-change: transform;
    }
    .bar-rank {
      width: 32px;
      font-size: 20px;
      font-weight: 900;
      color: rgba(255,255,255,0.8);
      text-align: center;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.7), 1px -1px 0 rgba(0,0,0,0.7), -1px 1px 0 rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.7);
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
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.6);
    }
    .bar-track {
      flex: 1;
      height: ${opts.barHeight}px;
      background: rgba(0,0,0,0.4);
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      border: 2px solid rgba(255,255,255,0.1);
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
      text-shadow: -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.7);
      position: relative;
      z-index: 1;
      font-variant-numeric: tabular-nums;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6);
    }
    .bar-info { display: flex; flex-direction: column; width: 120px; gap: 2px; text-align: right; }
    .bar-driver {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bar-votes {
      font-size: 18px;
      font-weight: 800;
      color: rgba(255,255,255,0.9);
      font-variant-numeric: tabular-nums;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6);
    }

    /* ── Footer ── */
    .footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 2px solid rgba(255,255,255,0.2);
      font-size: 22px;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8);
      font-weight: 800;
      color: #ffffff;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.7), 1px -1px 0 rgba(0,0,0,0.7), -1px 1px 0 rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5);
      animation: fadeIn 0.8s ease-out;
      width: 100%;
    }
    .footer .stat { display: flex; align-items: center; gap: 6px; }
    .footer .stat strong { color: #ffffff; font-weight: 900; font-size: 24px;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8); }

    /* ── Empty state ── */
    .empty { text-align: center; padding: 50px 30px; color: rgba(255,255,255,0.4); }
    .empty .icon { font-size: 40px; margin-bottom: 12px; }
    .empty p { font-size: 18px; font-weight: 700;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6); }

    /* ── Vote hint ── */
    .vote-hint {
      text-align: center;
      margin-top: 16px;
      padding: 10px 20px;
      background: rgba(11,36,103,0.9);
      border: 2px solid rgba(26,58,138,0.8);
      border-radius: 10px;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.5;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6);
      display: inline-block;
    }
    .vote-hint strong {
      color: #CC2020;
      font-weight: 900;
      font-size: 22px;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8);
    }
    .vote-hint-icon {
      margin-right: 4px;
      font-size: 14px;
    }

    /* ── Animations ── */
    .flash .bar-fill { animation: barFlash 0.6s ease-out; }
    @keyframes shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
    @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes barFlash { 0% { filter: brightness(1.6) saturate(1.3); } 100% { filter: brightness(1) saturate(1); } }
    @keyframes countPop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

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
    <div class="logo-bar">
      <img src="/logo.svg" alt="Beto Casting" />
      <div>
        <div class="brand">BETO<span class="red">CAST</span></div>
        <div class="subtitle">Live Poll</div>
      </div>
    </div>

    <div class="chart" id="chart">
      <div class="empty"><div class="icon">🏁</div><p>Cargando...</p></div>
    </div>

    <div style="text-align:center">
      <div class="vote-hint">
        <span class="vote-hint-icon">💬</span>
        ¿Quieres votar? Escribe en el chat <strong>#</strong> + número de tu piloto
      </div>
    </div>

    ${opts.showTotal ? '<div class="footer" id="footer"></div>' : ''}
  </div>

  <script>
    var streamId = '${stream.id}';
    var maxDisplay = ${opts.maxDisplay};
    var showNames = ${opts.showNames};
    var currentData = [];
    var voteCounts = {};
    var colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e',
      '#14b8a6', '#a855f7', '#f59e0b', '#10b981', '#6366f1'
    ];

    function debug(msg) {
      var el = document.getElementById('debug');
      if (el) el.textContent = msg;
    }

    function getColor(i) { return colors[i % colors.length]; }
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
        container.innerHTML = '<div class="empty"><div class="icon">🏁</div><p>Esperando votos...</p></div>';
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
          ? '<div class="bar-info"><div class="bar-driver">' + displayName + '</div><div class="bar-votes">' + item.count + ' votos</div></div>'
          : '<div class="bar-votes" style="width:60px">' + item.count + '</div>';

        html += '<div class="bar-row' + (isFlash ? ' flash' : '') + '">' +
          '<div class="bar-rank ' + rankClass + '">' + (i + 1) + '</div>' +
          '<div class="bar-number" style="color:' + color + '">#' + item.car_number + '</div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '">' + countInside + '</div></div>' +
          rightSide + '</div>';
      }
      container.innerHTML = html;
    }

    function updateFooter(totalVotes, totalVoters) {
      var footer = document.getElementById('footer');
      if (footer) {
        footer.innerHTML = '<span class="stat"><strong>' + totalVotes + '</strong> votos</span>';
      }
    }

    function loadInitial() {
      debug('loading...');
      fetch('/api/streams/' + streamId + '/votes')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          debug('loaded: ' + data.stats.totalVotes + ' votes');
          currentData = (data.results || []).slice(0, maxDisplay);
          currentData.forEach(function(r) { voteCounts[r.car_number] = r.count; });
          renderChart([]);
          if (data.stats) updateFooter(data.stats.totalVotes, data.stats.totalVoters);
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

      var socket = io();
      socket.on('connect', function() {
        debug('ws connected');
        socket.emit('join-stream', streamId);
      });

      socket.on('vote-update', function(data) {
        if (data.streamId !== streamId) return;
        var flashCars = [];
        data.results.slice(0, maxDisplay).forEach(function(r) {
          var old = voteCounts[r.car_number] || 0;
          if (r.count > old) flashCars.push(r.car_number);
          voteCounts[r.car_number] = r.count;
        });
        currentData = data.results.slice(0, maxDisplay);
        renderChart(flashCars);
      });

      socket.on('stats-update', function(data) {
        if (data.streamId !== streamId) return;
        updateFooter(data.stats.totalVotes, data.stats.totalVoters);
      });

      socket.on('disconnect', function() {
        debug('ws disconnected - polling');
        startPolling();
      });
    }

    var pollInterval = null;
    function startPolling() {
      if (pollInterval) return;
      pollInterval = setInterval(function() {
        fetch('/api/streams/' + streamId + '/votes')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var flashCars = [];
            (data.results || []).slice(0, maxDisplay).forEach(function(r) {
              var old = voteCounts[r.car_number] || 0;
              if (r.count > old) flashCars.push(r.car_number);
              voteCounts[r.car_number] = r.count;
            });
            currentData = (data.results || []).slice(0, maxDisplay);
            renderChart(flashCars);
            if (data.stats) updateFooter(data.stats.totalVotes, data.stats.totalVoters);
            debug('poll ok: ' + data.stats.totalVotes + ' votes');
          })
          .catch(function() { debug('poll error'); });
      }, 3000);
    }

    loadInitial();
  </script>
</body>
</html>`;
}

function getPredictOverlayHtml(stream: any, opts: {
  barHeight: number;
  showNames: boolean;
  fontSize: number;
  maxDisplay: number;
  chromaKey: boolean;
  bgColor: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BetoCast Predictions - ${stream.title || stream.id}</title>
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
      padding: 20px 30px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 14px;
      animation: fadeSlideDown 0.6s ease-out;
    }
    .header .icon {
      font-size: 28px;
    }
    .header .title {
      font-size: 24px;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8);
      font-weight: 900;
      font-style: italic;
      letter-spacing: 1px;
      color: #ffffff;
      text-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .header .title .highlight { color: #a855f7; }
    .header .subtitle {
      font-size: 14px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    /* ── Chart ── */
    .chart { display: flex; flex-direction: column; gap: 10px; width: 100%; }

    /* ── Bar Row ── */
    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
      transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
      will-change: transform;
    }
    .bar-number {
      width: 48px;
      font-size: ${opts.fontSize}px;
      font-weight: 800;
      text-align: right;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }
    .bar-track {
      flex: 1;
      height: ${opts.barHeight}px;
      background: rgba(0,0,0,0.4);
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      border: 2px solid rgba(255,255,255,0.1);
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
      text-shadow: -1px -1px 0 rgba(0,0,0,0.9), 1px -1px 0 rgba(0,0,0,0.9), -1px 1px 0 rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.7);
      position: relative;
      z-index: 1;
      font-variant-numeric: tabular-nums;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6);
    }
    .bar-info { display: flex; flex-direction: column; width: 200px; gap: 2px; }
    .bar-driver {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bar-predictions {
      font-size: 17px;
      font-weight: 800;
      color: rgba(255,255,255,0.85);
      font-variant-numeric: tabular-nums;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6);
    }

    /* ── Footer ── */
    .footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 2px solid rgba(255,255,255,0.2);
      font-size: 22px;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8);
      font-weight: 800;
      color: #ffffff;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.7), 1px -1px 0 rgba(0,0,0,0.7), -1px 1px 0 rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5);
      animation: fadeIn 0.8s ease-out;
      width: 100%;
    }
    .footer .stat { display: flex; align-items: center; gap: 6px; }
    .footer .stat strong { color: #ffffff; font-weight: 900; font-size: 24px;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8); }

    /* ── Winners ── */
    .winners {
      text-align: center;
      padding: 20px;
      margin-top: 16px;
      background: linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.2) 100%);
      border: 2px solid rgba(168,85,247,0.4);
      border-radius: 12px;
      animation: fadeIn 0.6s ease-out;
    }
    .winners .trophy { font-size: 48px; margin-bottom: 8px; }
    .winners .title {
      font-size: 22px;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.8), 1px -1px 0 rgba(0,0,0,0.8), -1px 1px 0 rgba(0,0,0,0.8), 1px 1px 0 rgba(0,0,0,0.8);
      font-weight: 900;
      color: #a855f7;
      margin-bottom: 12px;
    }
    .winners .list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }
    .winners .winner {
      background: rgba(168,85,247,0.3);
      border: 1px solid rgba(168,85,247,0.5);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 700;
      color: white;
    }

    /* ── Empty state ── */
    .empty { text-align: center; padding: 50px 30px; color: rgba(255,255,255,0.4); }
    .empty .icon { font-size: 40px; margin-bottom: 12px; }
    .empty p { font-size: 18px; font-weight: 700;
      text-shadow: -1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6); }

    /* ── Hint ── */
    .hint {
      text-align: center;
      margin-top: 10px;
      padding: 6px 12px;
      background: #4c1d95;
      border: 1px solid #6d28d9;
      border-radius: 6px;
      font-size: 17px;
      font-weight: 700;
      color: rgba(255,255,255,0.9);
      line-height: 1.4;
      display: inline-block;
    }
    .hint code {
      background: rgba(168,85,247,0.4);
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 800;
    }

    /* ── Animations ── */
    @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

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
    <div class="header">
      <span class="icon">🎯</span>
      <div>
        <div class="title">PREDI<span class="highlight">CTIONS</span></div>
        <div class="subtitle">¿Quién ganará?</div>
      </div>
    </div>

    <div class="chart" id="chart">
      <div class="empty"><div class="icon">🔮</div><p>Esperando predicciones...</p></div>
    </div>

    <div style="text-align:center">
      <div class="hint">
        Predice con <code>!predict #numero</code>
      </div>
    </div>

    <div class="footer" id="footer"></div>
    <div id="winners-container"></div>
  </div>

  <script>
    var streamId = '${stream.id}';
    var maxDisplay = ${opts.maxDisplay};
    var showNames = ${opts.showNames};
    var currentData = [];
    var predictionCounts = {};
    var colors = [
      '#a855f7', '#ec4899', '#8b5cf6', '#d946ef', '#f43f5e',
      '#6366f1', '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#14b8a6', '#06b6d4', '#3b82f6', '#84cc16', '#10b981'
    ];

    function debug(msg) {
      var el = document.getElementById('debug');
      if (el) el.textContent = msg;
    }

    function getColor(i) { return colors[i % colors.length]; }

    function renderChart(flashCars) {
      flashCars = flashCars || [];
      var container = document.getElementById('chart');
      if (currentData.length === 0) {
        container.innerHTML = '<div class="empty"><div class="icon">🔮</div><p>Esperando predicciones...</p></div>';
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
        var countInside = pct > 20 ? '<span class="count-inside">' + item.count + '</span>' : '';
        var displayName = item.driver_name ? item.driver_name : '';
        var rightSide = showNames
          ? '<div class="bar-info"><div class="bar-driver">' + displayName + '</div><div class="bar-predictions">' + item.count + ' predicciones</div></div>'
          : '<div class="bar-predictions" style="width:60px">' + item.count + '</div>';

        html += '<div class="bar-row' + (isFlash ? ' flash' : '') + '">' +
          '<div class="bar-number" style="color:' + color + '">#' + item.car_number + '</div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '">' + countInside + '</div></div>' +
          rightSide + '</div>';
      }
      container.innerHTML = html;
    }

    function updateFooter(totalPredictions, totalPredictors) {
      var footer = document.getElementById('footer');
      if (footer) {
        footer.innerHTML = '<span class="stat"><strong>' + totalPredictors + '</strong> participantes</span>' +
          '<span class="stat"><strong>' + totalPredictions + '</strong> predicciones</span>';
      }
    }

    function showWinners(winners, carNumber) {
      var container = document.getElementById('winners-container');
      if (!container || !winners || winners.length === 0) return;

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
      debug('loading predictions...');
      fetch('/api/streams/' + streamId + '/predictions')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          debug('loaded: ' + data.stats.totalPredictions + ' predictions');
          currentData = (data.results || []).slice(0, maxDisplay);
          currentData.forEach(function(r) { predictionCounts[r.car_number] = r.count; });
          renderChart([]);
          if (data.stats) updateFooter(data.stats.totalPredictions, data.stats.totalPredictors);
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

      var socket = io();
      socket.on('connect', function() {
        debug('ws connected');
        socket.emit('join-stream', streamId);
      });

      socket.on('prediction-update', function(data) {
        if (data.streamId !== streamId) return;
        var flashCars = [];
        data.results.slice(0, maxDisplay).forEach(function(r) {
          var old = predictionCounts[r.car_number] || 0;
          if (r.count > old) flashCars.push(r.car_number);
          predictionCounts[r.car_number] = r.count;
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

      socket.on('disconnect', function() {
        debug('ws disconnected - polling');
        startPolling();
      });
    }

    var pollInterval = null;
    function startPolling() {
      if (pollInterval) return;
      pollInterval = setInterval(function() {
        fetch('/api/streams/' + streamId + '/predictions')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var flashCars = [];
            (data.results || []).slice(0, maxDisplay).forEach(function(r) {
              var old = predictionCounts[r.car_number] || 0;
              if (r.count > old) flashCars.push(r.car_number);
              predictionCounts[r.car_number] = r.count;
            });
            currentData = (data.results || []).slice(0, maxDisplay);
            renderChart(flashCars);
            if (data.stats) updateFooter(data.stats.totalPredictions, data.stats.totalPredictors);
            debug('poll ok: ' + data.stats.totalPredictions + ' predictions');
          })
          .catch(function() { debug('poll error'); });
      }, 3000);
    }

    loadInitial();
  </script>
</body>
</html>`;
}
