# ForexConnect - Currency Exchange Platform

## Overview

ForexConnect is a modern web application that connects individuals and businesses needing currency exchange with verified forex traders through a competitive bidding system. The platform operates as a real-time marketplace where users can post exchange requests and receive offers from licensed bidders.

## System Architecture

**Frontend Architecture:**
- React 18 with TypeScript for type safety
- Vite for fast development and optimized builds
- Wouter for lightweight client-side routing
- TanStack Query for server state management and caching
- Tailwind CSS with shadcn/ui components for consistent design
- Dark/light theme support

**Backend Architecture:**
- Express.js server with TypeScript
- Session-based authentication using Replit Auth
- RESTful API design with WebSocket support for real-time features
- PostgreSQL database with Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL for scalable data storage

**Development Environment:**
- Replit-optimized configuration with hot module replacement
- Automatic database provisioning
- Built-in deployment pipeline

## Key Components

### Authentication System
- **Replit Auth Integration**: Seamless OAuth-based authentication
- **Role-based Access**: Users can be either "subscribers" (exchange requesters) or "bidders" (service providers)
- **Session Management**: Secure session storage in PostgreSQL using connect-pg-simple

### Database Schema
- **Users Table**: Stores user profiles with role-specific fields (company info, licenses, specializations for bidders)
- **Exchange Requests**: Currency exchange requests with priority levels
- **Rate Offers**: Competitive bids from traders
- **Chat Messages**: Real-time communication system
- **Transactions**: Completed exchange records
- **Sessions**: Secure session storage

### Real-time Features
- **WebSocket Integration**: Live updates for new offers, messages, and market activity
- **Chat System**: Global chat room for market communication
- **Live Market Stats**: Real-time statistics on active requests and online bidders

### Trading Workflow
1. **Request Creation**: Users specify currency pair, amount, desired rate (optional), and priority
2. **Bidding Process**: Any user can submit competitive rate offers on active requests
3. **Offer Management**: Request creators can view all offers, accept or decline individual offers, and message bidders privately
4. **Transaction Completion**: Automated balance updates and transaction records upon acceptance

## Data Flow

1. **User Authentication**: Replit Auth → Session Creation → Role Assignment
2. **Exchange Request**: Form Submission → Database Storage → Real-time Broadcast
3. **Rate Offers**: Bidder Submission → Validation → Notification to Requester
4. **Transaction Flow**: Offer Acceptance → Balance Updates → Transaction Record → Completion Notification

## External Dependencies

### Core Framework Dependencies
- React ecosystem (React, React DOM, React Hook Form)
- TypeScript for type safety
- Vite for build tooling
- Express.js for server framework

### UI and Styling
- Tailwind CSS for utility-first styling
- Radix UI primitives for accessible components
- Lucide React for consistent iconography
- Class Variance Authority for component variants

### Database and ORM
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL driver
- Drizzle Kit for migrations

### Authentication and Session Management
- OpenID Connect for Replit Auth
- Passport.js for authentication strategies
- Connect-pg-simple for PostgreSQL session storage

### Real-time Communication
- WebSocket (ws) for real-time features
- TanStack Query for server state synchronization

### Utilities
- Zod for runtime type validation
- Date-fns for date manipulation
- Memoizee for function memoization

## Deployment Strategy

**Development:**
- Replit development environment with hot reloading
- Automatic database provisioning
- Development-specific Vite plugins for enhanced debugging

**Production:**
- Autoscale deployment target for traffic handling
- Build process: Frontend (Vite) + Backend (ESBuild)
- Environment variable management for database and session secrets
- Static asset serving from dist/public

**Build Configuration:**
- Frontend: Vite build to dist/public
- Backend: ESBuild bundle to dist/index.js
- Port configuration: Internal 5000 → External 80

## Changelog

Changelog:
- June 19, 2025. Initial setup
- June 19, 2025. Added currency balance dashboard with UGX, USD, KES, EUR, GBP
- June 19, 2025. Added desired rate field to exchange requests
- June 19, 2025. Unified roles - both bidders and subscribers can create requests and offers
- June 19, 2025. Enhanced offers viewer with accept/decline functionality and private messaging hooks
- June 19, 2025. Updated branding from ForexConnect to Currencia, removed account balance from sidebar

## User Preferences

Preferred communication style: Simple, everyday language.