import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';

const router = Router();

// Endpoint for Evolution API webhooks
router.post('/evolution', WebhookController.handle);

export default router;
