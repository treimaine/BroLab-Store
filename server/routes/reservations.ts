import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertReservationSchema, ReservationStatus } from '../../shared/schema';
import { isAuthenticated as requireAuth } from '../auth';
import { createValidationMiddleware as validateRequest } from '../lib/validation';
import { sendMail } from '../services/mail';
import { generateICS } from '../utils/calendar';
import { reservationConfirmationTemplate } from '../templates/reservation-emails';

const router = Router();

// Create a new reservation
router.post('/',
  requireAuth,
  validateRequest(insertReservationSchema),
  async (req, res) => {
    try {
      const reservation = await storage.createReservation({
        ...req.body,
        user_id: req.user!.id
      });

      // Send confirmation email
      const emailContent = reservationConfirmationTemplate
        .replace('{{username}}', req.user!.username)
        .replace('{{serviceType}}', reservation.service_type)
        .replace('{{date}}', new Date(reservation.preferred_date).toLocaleDateString('fr-FR'))
        .replace('{{time}}', new Date(reservation.preferred_date).toLocaleTimeString('fr-FR'))
        .replace('{{duration}}', String(reservation.duration_minutes))
        .replace('{{price}}', (reservation.total_price / 100).toFixed(2))
        .replace('{{reservationId}}', String(reservation.id));

      await sendMail({
        to: req.user!.email,
        subject: 'Confirmation de votre réservation',
        html: emailContent
      });

      res.status(201).json(reservation);
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      res.status(500).json({ error: error.message || 'Failed to create reservation' });
    }
  }
);

// Get user's reservations
router.get('/me',
  requireAuth,
  async (req, res) => {
    try {
      const reservations = await storage.getUserReservations(req.user!.id);
      res.json(reservations);
    } catch (error: any) {
      console.error('Error fetching user reservations:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch reservations' });
    }
  }
);

// Get a specific reservation
router.get('/:id',
  requireAuth,
  async (req, res) => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      if (reservation.user_id !== req.user!.id && req.user!.role !== 'service_role') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      res.json(reservation);
    } catch (error: any) {
      console.error('Error fetching reservation:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch reservation' });
    }
  }
);

// Update reservation status
router.patch('/:id/status',
  requireAuth,
  validateRequest(z.object({    status: z.enum(ReservationStatus)  })),
  async (req, res) => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      if (reservation.user_id !== req.user!.id && req.user!.role !== 'service_role') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updatedReservation = await storage.updateReservationStatus(
        req.params.id,
        req.body.status
      );

      // Send status update email
      const statusUpdateContent = `
        <h2>Mise à jour de votre réservation</h2>
        <p>Bonjour ${req.user!.username},</p>
        <p>Le statut de votre réservation pour ${updatedReservation.service_type} a été mis à jour.</p>
        <p><strong>Nouveau statut :</strong> ${req.body.status}</p>
        <p><strong>Date :</strong> ${new Date(updatedReservation.preferred_date).toLocaleDateString('fr-FR')}</p>
        <p><strong>Heure :</strong> ${new Date(updatedReservation.preferred_date).toLocaleTimeString('fr-FR')}</p>
      `;

      await sendMail({
        to: req.user!.email,
        subject: `Mise à jour de votre réservation - ${req.body.status}`,
        html: statusUpdateContent
      });

      res.json(updatedReservation);
    } catch (error: any) {
      console.error('Error updating reservation status:', error);
      res.status(500).json({ error: error.message || 'Failed to update reservation status' });
    }
  }
);

// Get reservation ICS file
router.get('/:id/calendar',
  requireAuth,
  async (req, res) => {
    try {
      const reservation = await storage.getReservation(req.params.id);
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      if (reservation.user_id !== req.user!.id && req.user!.role !== 'service_role') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const icsContent = generateICS({
        summary: `BroLab - ${reservation.service_type}`,
        description: reservation.notes || '',
        startTime: new Date(reservation.preferred_date),
        durationMinutes: reservation.duration_minutes
      });

      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="reservation-${reservation.id}.ics"`);
      res.send(icsContent);
    } catch (error: any) {
      console.error('Error generating calendar file:', error);
      res.status(500).json({ error: error.message || 'Failed to generate calendar file' });
    }
  }
);

// Get reservations by date range (admin only)
router.get('/range/:start/:end',
  requireAuth,
  async (req, res) => {
    try {
      if (req.user!.role !== 'service_role') {
        return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
      }
      const startDate = new Date(req.params.start);
      const endDate = new Date(req.params.end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      const reservations = await storage.getReservationsByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );
      res.json(reservations);
    } catch (error: any) {
      console.error('Error fetching reservations by date range:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch reservations' });
    }
  }
);

export default router;