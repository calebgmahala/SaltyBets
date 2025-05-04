# Salty Bets Core

A private-party betting platform for Salty Boy matches, built with TypeORM, TypeGraphQL, and Apollo Server. This package provides the backend logic, GraphQL API, and data model for managing users, matches, and bets in a small-group setting.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Intended Use & Flow](#intended-use--flow)
- [Features](#features)
- [User Roles & Permissions](#user-roles--permissions)
- [API Overview](#api-overview)
- [Entities & Data Model](#entities--data-model)
- [Setup & Configuration](#setup--configuration)
- [Development & Scripts](#development--scripts)
- [Extending & Customization](#extending--customization)

---

## Project Overview

This package powers a private betting experience for Salty Boy matches, designed for small groups at private parties. It allows an admin to create users, manage matches, and lets users place and cancel bets in real time. The system is built for fun, not for public or commercial gambling.

---

## Intended Use & Flow

**Typical usage scenario:**

1. **Admin creates users** for all party participants.
2. **Players log in** and update their account details (alias, etc.).
3. **Managers/Admins**:
   - Fetch and record new match information.
   - Open/close the betting window.
   - End and payout the current match.
   - All of this is handled via the `createMatch` mutation.
4. **Users**:
   - Place and cancel bets (in increments) while the betting window is open.
   - See live updates of bet totals via the `betTotalsUpdated` subscription.
5. **After a match**:
   - Managers/Admins end the match, process payouts, and start a new match when ready.
   - All of this is handled via the `createMatch` mutation.

---

## Features

- **User Management**: Admins create and manage users; users can update their own info.
- **Role-based Access**: Admins, Managers, and Users have different permissions.
- **Match Lifecycle**: Create, end, and payout matches; fetch current match info.
- **Betting System**: Place/cancel bets on RED or BLUE fighters; see live bet totals.
- **Real-time Updates**: Subscriptions notify all users of bet total changes.
- **Secure Auth**: JWT-based authentication and role checks.
- **Extensible**: Built with TypeGraphQL and TypeORM for easy extension.

---

## User Roles & Permissions

| Role            | Description                                      | Permissions                                                                 |
|-----------------|--------------------------------------------------|-----------------------------------------------------------------------------|
| USER            | Regular player                                   | Place/cancel bets, update own account                                       |
| PAYOUT_MANAGER  | Trusted manager                                  | All USER actions + end/payout matches, create new matches                   |
| ADMIN           | Full system access                               | All actions, including user management                                      |

---

## API Overview

The backend exposes a **GraphQL API** with the following main resolvers:

### UserResolver
- `login(username, password): String` — Authenticate and receive JWT
- `logout: Boolean` — Logout and blacklist token
- `createUser(input): User` — (Admin only) Create a new user
- `updateUser(id, input): User` — Update user info
- `deleteUser(id): Boolean` — (Admin only) Delete a user
- `user(id): User` — Fetch a user by ID
- `users: [User]` — List all users

### MatchResolver
- `getCurrentMatch: Match` — Get the current/most recent match
- `createMatch(winner?): Match` — (Manager/Admin) End current match, payout, and create new match
- `endMatch(matchId, winner?): Match` — (Manager/Admin) End a match and process payouts

### BetResolver
- `getMatchTotals: MatchTotalsDto` — Get current bet totals for the match
- `getMyBet: Bet` — Get the current user's bet
- `placeBet(amount, fighterColor): Boolean` — Place a bet
- `cancelBet(amount): Boolean` — Cancel a bet
- `finalizeBets(matchId): Boolean` — (Manager/Admin) Finalize all bets for a match

### Subscriptions
- `betTotalsUpdated: MatchTotalsDto` — Live updates of bet totals for all users

---

## Entities & Data Model

### User
- `id`, `username`, `password`, `alias`, `securityLevel`, `balance`, `totalWins`, `totalLosses`, `totalRevenueGained`, `totalRevenueLost`, `bets`, `createdAt`, `updatedAt`

### Match
- `id`, `externalId`, `winner`, `fighterBlueId`, `fighterRedId`, `bets`, `totalBlueBets`, `totalRedBets`, `createdAt`

### Bet
- `id`, `amount`, `fighterColor`, `user`, `match`, `createdAt`

### Enums
- `SecurityLevel`: USER, PAYOUT_MANAGER, ADMIN
- `FighterColor`: RED, BLUE

---

## Setup & Configuration

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Configure the database:**
   - Edit `src/data-source.ts` or set environment variables:
     - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
     - `TYPEORM_SYNCHRONIZE` (set to `true` for dev, `false` for prod)
     - `TYPEORM_LOGGING` (optional)
     - `JWT_SECRET` (for authentication)
3. **Start the server:**
   ```sh
   npm start
   ```
   The server will run on [http://localhost:4000](http://localhost:4000) by default.

---

## Development & Scripts

- `npm run dev` — Start with nodemon for hot-reloading
- `npm run seed` — Seed the database (see `src/scripts/seed.ts`)
- `npm run generate-schema` — Generate the GraphQL schema file

---

## Extending & Customization

- **Add new resolvers** in `src/resolvers/`
- **Add new entities** in `src/entities/`
- **Add services** in `src/services/`
- **Update types/enums** in `src/types/`
- **Logger**: Use the provided logger in `src/utils/logger` for all logging (see code for usage)

---

## License

This project is for private, non-commercial use only. Not for public gambling or commercial deployment.
