# Currencia - Currency Exchange Platform

## Overview

Currencia is a modern web application that connects individuals and businesses needing currency exchange with verified forex bureau through a competitive bidding system. The platform operates as a real-time marketplace where users can post exchange requests and receive offers from licensed bidders.

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
- **Unified Role System**: All users have a single "trader" role with access to both requesting and providing exchange services
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
- June 20, 2025. Added comprehensive trades and transaction history feature
- June 20, 2025. Implemented currency portfolio management with 18 supported currencies
- June 20, 2025. Added side menu to My Trading Activity page with filters and stats
- June 20, 2025. Enhanced chat system with bid accept/reject actions and real-time notifications
- June 20, 2025. Updated trading activity page to display volume per currency like dashboard
- June 20, 2025. Added settings page with money transfer functionality between operational and wallet accounts
- June 20, 2025. Created notifications dropdown with real-time updates and unread indicators
- June 21, 2025. Updated branding from ForexConnect to Currencia across all components
- June 21, 2025. Changed terminology from "forex traders" to "forex bureau" throughout the platform
- June 21, 2025. Merged subscriber and bidder roles into unified "trader" role - all users can now both request and provide exchange services
- June 21, 2025. Added comprehensive sidebar and navigation system across all pages with responsive design and centralized layout component
- June 21, 2025. Removed navigation from My Trading Activity page per user request - now uses standalone header design
- June 21, 2025. Removed navigation section from trading activity sidebar and fixed rate offers API query error
- June 21, 2025. Implemented animated currency exchange rate comparison slider with real-time updates, smooth transitions, and interactive controls
- June 24, 2025. Created comprehensive threaded comment system for exchange requests with nested replies and real-time updates
- June 24, 2025. Designed and integrated professional Currencia logo system with multiple variations (full, icon, wordmark)
- June 24, 2025. Enhanced notification system with bell shake animation and auto-closing demo components
- June 24, 2025. Updated branding throughout application with new logo and improved visual identity
- June 26, 2025. Fixed trades display issue by creating proper completed transaction data and ensuring proper database relationships
- June 26, 2025. Added comprehensive dummy trading data with realistic completed exchanges for testing interface functionality
- June 26, 2025. Added validation to prevent duplicate currency exchange requests for same currency pairs
- June 26, 2025. Fixed exchange requests visibility in chat room with proper message creation and WebSocket broadcasting
- June 26, 2025. Enhanced chat interface with rate offer and counter offer buttons in reply fields for streamlined trading
- June 26, 2025. Fixed threaded chat system to prevent replies from appearing in main chat room - added "reply" message type and proper filtering
- June 26, 2025. Implemented comprehensive user registration system with business details and profile completion workflow
- June 26, 2025. Added automatic company name defaulting to first and last name for new users during authentication
- June 26, 2025. Implemented automatic user logout after 15 minutes of inactivity with activity tracking and status management
- June 26, 2025. Set light theme as default theme instead of system theme for better user experience
- January 11, 2025. Updated default theme to light mode and changed storage key to currencia-ui-theme
- June 26, 2025. Fixed navigation menu highlighting to show selected menu items with blue background
- January 12, 2025. Implemented comprehensive RBAC (Role-Based Access Control) system with enterprise-level user management, role management, and permissions system
- January 12, 2025. Created enhanced admin dashboard with User Management and Role Management tabs
- January 12, 2025. Added RBAC API routes for user administration and role assignments with audit logging
- January 12, 2025. Populated database with default roles (Administrator, Moderator, Trader, Viewer) and 23 different permission categories
- January 12, 2025. Assigned admin rights to DENNIS LEKU (dennisleku@gmail.com) with audit trail logging
- January 12, 2025. Developed comprehensive audit log module with professional viewer interface, filtering capabilities, and export functionality
- January 12, 2025. Integrated audit logging service throughout the application tracking all user actions, admin operations, security events, and business activities
- January 12, 2025. Enhanced admin dashboard with dedicated Audit Logs tab providing real-time monitoring and compliance tracking
- January 12, 2025. Fixed authentication middleware and storage imports to resolve 403 Forbidden errors for admin functionality

## User Preferences

Preferred communication style: Simple, everyday language.