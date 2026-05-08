# Product Overview

A WeChat Mini Program for nail salon and eyelash extension shop membership management (美甲美睫会员管理系统).

## Core Features

- **Member Management**: Registration, profiles, membership levels (normal/silver/gold/diamond), points system
- **Service Catalog**: Nail art, eyelash extensions, nail care, combo packages with pricing and duration
- **Appointment System**: Booking with technician selection or auto-assignment, conflict detection, status tracking
- **Admin Panel**: Service management, technician scheduling, appointment oversight
- **Notifications**: Appointment reminders, admin alerts for new bookings

## Domain Model

- **Members**: Tiered loyalty system based on total consumption (1000/5000/10000 CNY thresholds)
- **Services**: Categorized offerings with images, pricing, and duration
- **Technicians**: Staff with specialties, availability schedules, and status tracking
- **Appointments**: Full lifecycle from pending → in_service → completed/cancelled
- **Records**: Consumption history and points transactions

## Business Rules

- Points earned on completed services
- Member level upgrades based on cumulative spending
- Appointment cancellation restrictions based on timing
- Technician auto-assignment prioritizes those with fewer bookings
