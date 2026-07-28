import { Router } from 'express';
import { queryOne } from '../db/helpers.js';
import { getIo } from '../websocket/index.js';
import * as voteService from '../services/vote.service.js';
import * as predictionService from '../services/prediction.service.js';

export const streamsRouter = Router();

streamsRouter.get('/live', (req, res) => {
  const stream = queryOne('SELECT * FROM streams WHERE status = ? ORDER BY created_at DESC LIMIT 1', ['active']);
  if (!stream) return res.status(404).json({ error: 'No hay stream activo' });
  res.json(stream);
});

streamsRouter.get('/', (req, res) => {
  const streams = voteService.listStreams();
  res.json(streams);
});

streamsRouter.get('/:id', (req, res) => {
  const stream = voteService.getStream(req.params.id);
  if (!stream) return res.status(404).json({ error: 'Stream no encontrado' });
  res.json(stream);
});

streamsRouter.post('/', (req, res) => {
  const { youtube_url, title } = req.body;
  if (!youtube_url) return res.status(400).json({ error: 'youtube_url es requerido' });

  const stream = voteService.createStream(youtube_url, title);
  res.status(201).json(stream);
});

streamsRouter.put('/:id', (req, res) => {
  const { title, status, max_pilots_display } = req.body;
  const stream = voteService.updateStream(req.params.id, { title, status, max_pilots_display });
  if (!stream) return res.status(404).json({ error: 'Stream no encontrado' });
  res.json(stream);
});

streamsRouter.delete('/:id', (req, res) => {
  const deleted = voteService.deleteStream(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Stream no encontrado' });
  res.json({ success: true });
});

streamsRouter.get('/:id/pilots', (req, res) => {
  const pilots = voteService.listPilots(req.params.id);
  res.json(pilots);
});

streamsRouter.post('/:id/pilots', (req, res) => {
  const { car_number, driver_name, color } = req.body;
  if (!car_number) return res.status(400).json({ error: 'car_number es requerido' });

  try {
    const pilot = voteService.addPilot(req.params.id, car_number, driver_name, color);
    res.status(201).json(pilot);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

streamsRouter.delete('/:id/pilots/:carNumber', (req, res) => {
  const removed = voteService.removePilot(req.params.id, req.params.carNumber);
  if (!removed) return res.status(404).json({ error: 'Piloto no encontrado' });
  res.json({ success: true });
});

streamsRouter.get('/:id/votes', (req, res) => {
  const results = voteService.getVoteResults(req.params.id);
  const stats = voteService.getVoteStats(req.params.id);
  res.json({ results, stats });
});

streamsRouter.get('/:id/predictions', (req, res) => {
  const results = predictionService.getPredictionResults(req.params.id);
  const stats = predictionService.getPredictionStats(req.params.id);
  res.json({ results, stats });
});

streamsRouter.post('/:id/predictions/resolve', (req, res) => {
  const { car_number } = req.body;
  if (!car_number) return res.status(400).json({ error: 'car_number es requerido' });

  const result = predictionService.resolvePredictions(req.params.id, car_number);

  const io = getIo();
  io.to(`stream:${req.params.id}`).emit('predictions-resolved', {
    streamId: req.params.id,
    carNumber: car_number,
    winners: result.winners,
  });

  res.json(result);
});
