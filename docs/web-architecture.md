# Web App Architecture

```mermaid
flowchart LR
  Browser[User/Admin Browser] --> Next[Next.js App Router]
  Next --> API[API Routes]
  API --> Prisma[Prisma ORM]
  Prisma --> SQLite[(SQLite dev.db)]
  API --> PDF[PDF/QR Generator]
  API --> Audit[Audit Logs]
```
