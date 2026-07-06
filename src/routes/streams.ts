import { Router } from 'express';
import * as voteService from '../services/vote.service.js';

export const streamsRouter = Router();

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
