# Architecture Design - BarberQueue WhatsApp

## Overview
A WhatsApp-based queue management system for barbers, integrated with Evolution API and MySQL.

## Tech Stack
- **Backend:** Node.js, TypeScript, Express.js
- **Database:** MySQL (Prisma ORM)
- **WhatsApp Gateway:** Evolution API (via Webhooks)
- **Deployment:** Easypanel

## Database Schema (MySQL)

### `Barber`
- `id`: Int (PK, Auto-increment)
- `name`: String
- `phone`: String (Unique - Barber's WhatsApp number)
- `evolutionInstance`: String (Name of the instance in Evolution API)
- `token`: String (Evolution API token for this instance)
- `createdAt`: DateTime

### `Service`
- `id`: Int (PK)
- `name`: String
- `price`: Decimal
- `duration`: Int (Minutes)
- `barberId`: Int (FK)

### `QueueEntry`
- `id`: Int (PK)
- `customerName`: String
- `customerPhone`: String
- `serviceId`: Int (FK)
- `status`: Enum (`AWAITING_PAYMENT`, `QUEUED`, `IN_SERVICE`, `FINISHED`, `SKIPPED`)
- `position`: Int
- `paymentConfirmed`: Boolean
- `createdAt`: DateTime
- `updatedAt`: DateTime

## WhatsApp Flow Logic
1. **Webhook Reception:** System receives message from Evolution API.
2. **State Machine:**
   - If not in queue: Offer services.
   - If selected service: Request payment (future) / Confirm Entry.
   - If confirmed: Assign `position` and notify if position <= 3.
3. **Barber Commands:**
   - `/proximo`: 
     - Move current `IN_SERVICE` to `FINISHED`.
     - Move top of `QUEUED` to `IN_SERVICE`.
     - Update all `position` values.
     - Notify the new 3rd person in queue.

## Deployment Guidelines (Easypanel)
- Use `DATABASE_URL` env var for Prisma connection.
- Ensure `EVOLUTION_API_URL` and `EVOLUTION_API_KEY` are set.
- Port: 3000 (default).
