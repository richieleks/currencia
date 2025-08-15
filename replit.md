# Currencia - Currency Exchange Platform

## Overview

Currencia is a modern web application designed to act as a real-time marketplace for currency exchange. It connects individuals and businesses with verified forex bureaus through a competitive bidding system. The platform allows users to post exchange requests and receive competitive offers from licensed bidders. The core vision is to provide a transparent, efficient, and secure environment for currency exchange, leveraging a unified "trader" role that allows all users to both request and provide exchange services.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

**Frontend:**
The frontend is built with React 18 and TypeScript, utilizing Vite for fast development and optimized builds. Wouter provides lightweight client-side routing, and TanStack Query handles server state management and caching. Styling is managed with Tailwind CSS and shadcn/ui components, supporting both dark and light themes for a consistent design.

**Backend:**
The backend is an Express.js server developed in TypeScript. It features a RESTful API design with WebSocket support for real-time functionalities. Session-based authentication is integrated using Replit Auth. Data is persistently stored in a PostgreSQL database, with Drizzle ORM providing type-safe database operations, leveraging Neon serverless PostgreSQL for scalability.

**Core Features & Design Patterns:**
- **Unified Trader Role:** A core design decision is that all users are assigned a single "trader" role, enabling them to both request and provide currency exchange services.
- **Authentication System:** Email/password authentication system with bcrypt password hashing, secure session management stored in PostgreSQL, and automatic password change requirements for default accounts.
- **Real-time Capabilities:** Extensive use of WebSockets for live updates on offers, messages, and market activity, including a global chat system and live market statistics.
- **Trading Workflow:** A streamlined process for request creation, competitive bidding, offer management (acceptance/declining), and automated transaction completion.
- **Financial Accuracy:** All decimal precision for financial figures is standardized to exactly 2 decimal places across the application for minor currencies and 6 for major currencies.
- **Role-Based Access Control (RBAC):** A comprehensive RBAC system with enterprise-level user and role management, including a professional admin dashboard with user management, role management, and audit logging capabilities.
- **Audit Logging:** A comprehensive audit log module tracks all user actions, admin operations, security events, and business activities, with a professional viewer interface.
- **Trader Verification System:** A multi-layered verification system with dedicated database tables, API endpoints, and a UI for managing verification requests and documents.
- **Bank Account Integration:** A system for managing bank accounts with real-time balance synchronization (via mock API), CRUD operations, and integration into the user's currency portfolio.
- **Enhanced Session Management:** Includes activity tracking, a 5-minute auto-logout functionality with warnings, and real-time active user counts.

## External Dependencies

- **React Ecosystem:** React, React DOM, React Hook Form
- **TypeScript:** For type safety across the application.
- **Vite:** Build tool for frontend.
- **Express.js:** Backend server framework.
- **UI & Styling:** Tailwind CSS, Radix UI, Lucide React, Class Variance Authority.
- **Database & ORM:** Drizzle ORM, Neon serverless PostgreSQL driver, Drizzle Kit.
- **Authentication & Session Management:** OpenID Connect for Replit Auth, Passport.js, Connect-pg-simple.
- **Real-time Communication:** `ws` (WebSocket), TanStack Query.
- **Utilities:** Zod (runtime type validation), Date-fns (date manipulation), Memoizee (function memoization).