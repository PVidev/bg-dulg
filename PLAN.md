# 🚀 TIP.md – Service History SaaS Architecture Concept

## 🎯 Твоята цел

1. Сега → 1 сервиз (локално / затворено)
2. После → много сервизи
3. Споделяне по VIN между сервизи
4. Клиент НЕ вижда други клиенти
5. Enterprise-ready архитектура
6. Абонаментен модел

---

## ❗ Ключово архитектурно решение

Ако искаш:

> VIN да може да се вижда от други сервизи в бъдеще

Тогава:

* ❌ Не можеш да останеш само с JSON локално
* ❌ Не можеш да имаш изцяло offline система
* ✅ Трябва ти централен бекенд

---

# 🏗️ Правилната архитектура (StartUp → Enterprise Ready)

## 🔹 1. Frontend (React / Next.js)

Функционалности:

* Dashboard
* Клиенти
* Автомобили
* Ремонти
* Отчети
* VIN Search (глобално търсене)

Frontend-ът комуникира само с API.

---

## 🔹 2. Backend (централен)

Технология: Node.js + Express (или алтернативно Laravel)

База данни:

* PostgreSQL
* или MySQL

❌ Не JSON
❌ Не SQLite

Защо?

* Multi-tenant архитектура
* Глобално търсене по VIN
* Отчетност
* Сигурност
* Абонаментна логика
* Скалиране

---

# 🧠 VIN Sharing логика

Всеки сервиз има собствен `service_center_id`.

### Таблица: service_centers

* id
* name
* subscription_plan
* status

### Таблица: users

* id
* service_center_id
* role (admin, mechanic, accountant)

### Таблица: service_records

* id
* service_center_id
* vin
* description
* price
* date
* visibility (private / shared)

---

## 🔎 VIN Search логика

Endpoint:

```
GET /vin/:vin
```

Връща записи:

* От текущия сервиз
* От други сервизи, където visibility = shared

НЕ връща:

* Име на клиент
* Телефон
* Адрес

Връща само:

* Дата
* Описание
* Цена
* Сервиз (по избор)

---

# 🏢 Multi-Tenant Архитектура (ключова част)

Всички записи винаги съдържат:

```
service_center_id
```

Това гарантира:

* Сервиз А не вижда клиентите на Сервиз Б
* Но може да вижда shared VIN записи

---

# 💳 Абонаментен модел

Stripe интеграция

Планове:

* Basic (без VIN sharing)
* Pro (VIN sharing + отчети)
* Enterprise (API + analytics)

Backend проверява `subscription_status` преди достъп до premium функционалности.

---

# 🧱 Минимална структура

## Backend

```
/server
  /routes
  /controllers
  /middleware
  /models
```

## Frontend

```
/dashboard
/customers
/vehicles
/services
/reports
```

---

# 🚀 Стартиране – Варианти

## Вариант A (препоръчителен)

Cloud базирана система:

* Frontend → Next.js
* Backend → Node API
* DB → PostgreSQL
* Hosting → VPS / Railway / Render

Потребителят влиза през браузър.

---

## Вариант B (хибрид)

Electron App
+
Cloud Backend

Локално UI, но данните са онлайн.

---

# ❗ Важно предупреждение

Не започвай с:

* JSON
* Локални бази
* Offline-only архитектура

Ще трябва да пренапишеш системата при мащабиране.

---

# 📈 Enterprise Архитектурен модел

```
[ React Frontend ]
        ↓
[ API Layer ]
        ↓
[ PostgreSQL ]
        ↓
[ Stripe ]
        ↓
[ VIN Shared Layer ]
```

---

# 🧩 Поддръжка

## Логове

* Запис на действия (audit log)

## Backup

* Daily database backup

## Updates

* Автоматично при deploy

## Scaling

* Няма лимит на сервизи
* Multi-tenant ready

---

# 🧠 Стратегическо позициониране

Това не е просто сервизна програма.

Това е:

> Мрежа от сервизи със споделена сервизна история по VIN.

Потенциал:

* Национална мрежа
* ЕС мрежа
* Enterprise API

---

Документът описва архитектурната визия и посоката за развитие на Startup → Enterprise Service History Platform.

---

# ⚠️ Risk Analysis (GDPR & VIN Data Compliance)

## 1️⃣ GDPR Рискове

### Лични данни в системата:

* Име на клиент
* Телефон
* Имейл
* Регистрационен номер
* VIN (индиректно може да се свърже с физическо лице)

### Основни рискове:

* Нерегламентиран достъп между сервизи
* Изтичане на клиентски данни
* Липса на логове кой какво е гледал
* Липса на "Right to be forgotten"

---

## ✅ GDPR Мерки

### Data Isolation

* Всички клиентски данни са изолирани по `service_center_id`
* VIN sharing връща само:

  * дата
  * описание
  * цена
* Без лични данни

### Audit Log

Таблица: `audit_logs`

* user_id
* action
* entity_type
* entity_id
* timestamp
* ip_address

### Right to be Forgotten

* Анонимизация вместо триене
* Замяна на лични полета с hashed стойности

### Encryption

* HTTPS задължително
* Encryption at rest (DB level ако е възможно)

---

## 2️⃣ VIN Data Compliance

VIN не е директно лична информация, но:

* може да се свърже с рег. номер
* може да се свърже със собственик

Затова:

* VIN search не трябва да показва клиент
* VIN search трябва да показва само сервизна история
* Достъпът да е само за регистрирани сервизи

---

# 🔬 Технически Breakdown (Laravel Architecture)

## Middleware Layer

### Примерни middleware:

* `auth` → проверка за логнат потребител
* `tenant` → гарантира, че заявката съдържа правилния service_center_id
* `subscribed` → проверява активен план
* `role:admin` → проверка за роля

Пример flow:

```
Request
   ↓
Auth Middleware
   ↓
Tenant Middleware
   ↓
Subscription Middleware
   ↓
Controller
```

---

## Multi-Tenancy Подход

### Подход 1: Single DB + service_center_id (препоръчителен старт)

Предимства:

* По-лесен deployment
* По-ниски разходи
* По-лесен backup

### Подход 2: Separate Database per Tenant (Enterprise)

Предимства:

* Пълна изолация
* По-добра сигурност
* По-лесен enterprise contract

Недостатък:

* По-сложна инфраструктура

---

## Laravel Packages

* Authentication → Laravel Breeze / Jetstream
* Roles & Permissions → Spatie Laravel Permission
* Multi-tenancy → Stancl Tenancy (ако се избере advanced вариант)
* Subscription → Laravel Cashier

---

# 💳 Subscription Flow (Stripe + Cashier)

## User Signup Flow

```
User Registers
      ↓
Creates Service Center
      ↓
Selects Plan
      ↓
Redirect to Stripe Checkout
      ↓
Stripe Webhook
      ↓
Subscription Activated
      ↓
Access Granted
```

---

## Middleware Subscription Check

```
Route → middleware('subscribed:pro')
```

Ако subscription_status != active:

* връща 402 / 403
* показва upgrade page

---

# 🛡️ Failure Scenarios

## 1. Subscription Expired

* Read-only режим
* Блокиране на нови записи

## 2. Stripe Webhook Failure

* Retry logic
* Manual verification endpoint

## 3. Data Breach

* Immediate token invalidation
* Password reset
* Audit review

---

# 📈 Enterprise Readiness Checklist

* Multi-tenant isolation
* Audit logging
* Encrypted traffic
* Daily backup
* Role system
* Subscription enforcement
* GDPR compliance layer

---

# 🔐 Security Hardening Document

## 1️⃣ Infrastructure Security

### Server Layer

* Firewall (UFW / Cloud Firewall)
* Allow only ports 80 / 443
* SSH key authentication only
* Fail2Ban
* Automatic security updates

### Hosting Best Practice

* Separate DB server (production)
* Private DB network access (no public exposure)
* Environment variables stored securely

---

## 2️⃣ Application Security

### Authentication Hardening

* Password hashing (bcrypt / Argon2)
* Rate limiting on login
* 2FA (optional for Pro / Enterprise)
* Session expiration policy

### Authorization

* Strict role-based access control (RBAC)
* Policy classes for every critical model
* No direct ID exposure (use UUIDs if needed)

---

## 3️⃣ API Security

* JWT or Sanctum tokens
* Token expiration & refresh flow
* Rate limiting per tenant
* IP logging
* CSRF protection (web routes)

---

## 4️⃣ Data Protection

### Encryption

* HTTPS (Let's Encrypt minimum)
* Database encryption at rest (if supported)
* Encrypted backups

### Sensitive Fields

* Hash or encrypt:

  * Client email
  * Client phone
* VIN stored as plain (operational need)

---

## 5️⃣ Backup Strategy

* Daily automated backup
* 7-day rolling backups
* Weekly full backup snapshot
* Backup stored off-site (S3 compatible storage)

---

## 6️⃣ Incident Response Plan

If breach detected:

1. Invalidate all sessions
2. Force password reset
3. Notify affected tenants
4. Audit log review
5. Patch vulnerability

---

# 📈 Monetization Strategy (Financial Model)

## 🎯 Target Market

Primary:

* Small & medium auto repair shops
* Independent garages

Future:

* Service chains
* Fleet management companies
* Insurance integrations

---

## 💳 Subscription Plans

### 🟢 Basic – €29 / month

* 1 Service Center
* Unlimited vehicles
* No VIN sharing
* Basic reports

### 🔵 Pro – €79 / month

* VIN sharing enabled
* Advanced reports
* Audit logs
* Role system

### 🟣 Enterprise – €199+ / month

* API access
* Dedicated support
* Custom branding
* Multi-location support

---

## 📊 Revenue Projection Example

If:

* 50 Basic users → 50 × €29 = €1,450
* 30 Pro users → 30 × €79 = €2,370
* 10 Enterprise → 10 × €199 = €1,990

Total Monthly = €5,810
Annual ≈ €69,720

---

## 🚀 Growth Strategy

Phase 1 – България

* Direct outreach
* Facebook groups
* On-site demo visits

Phase 2 – ЕС

* Multilingual support
* SEO around "VIN service history"

Phase 3 – Network Effect

* Incentivize VIN sharing
* Discount for network members

---

## 🔁 Upsell Opportunities

* SMS reminders
* Invoice automation
* Accounting export
* Insurance integration
* Marketplace for parts

---

## 🧠 Long-Term Valuation Logic

SaaS valuation often 5–8× ARR.

If ARR = €500,000
Potential valuation = €2.5M – €4M

---

# 📊 Реална DB Схема (Production Ready)

## service_centers

* id (PK)
* name (indexed)
* subscription_plan
* subscription_status (indexed)
* created_at
* updated_at

## users

* id (PK)
* service_center_id (FK, indexed)
* name
* email (unique, indexed)
* password
* role (indexed)
* created_at

## customers

* id (PK)
* service_center_id (FK, indexed)
* name (indexed)
* phone (indexed)
* email (nullable)
* created_at

## vehicles

* id (PK)
* service_center_id (FK, indexed)
* customer_id (FK, indexed)
* vin (indexed)
* plate_number (indexed)
* make
* model
* year

INDEXES:

* index(vin)
* index(service_center_id, vin)

## service_records

* id (PK)
* service_center_id (FK, indexed)
* vehicle_id (FK, indexed)
* vin (indexed)
* description (text)
* price (decimal indexed)
* visibility (indexed)
* service_date (indexed)
* created_at

Composite Index:

* index(vin, visibility)

## audit_logs

* id (PK)
* service_center_id (indexed)
* user_id (indexed)
* action
* entity_type
* entity_id
* ip_address
* created_at (indexed)

---

# 🧱 MVP Технически План – 90 Дни

## Фаза 1 (Дни 1–30) – Core System

* Setup Laravel backend
* Auth + Role system
* CRUD: Customers
* CRUD: Vehicles
* CRUD: Service Records
* Basic Dashboard
* Basic Reports

Goal: 1 работещ сервиз

---

## Фаза 2 (Дни 31–60) – Multi-Tenant + Subscription

* Stripe integration
* Cashier subscription logic
* Tenant isolation middleware
* Basic VIN search (local only)
* Audit logging

Goal: SaaS-ready версия

---

## Фаза 3 (Дни 61–90) – VIN Network + Hardening

* Global VIN search
* Visibility control
* Security hardening
* Backup automation
* Beta testing with 3–5 сервиза

Goal: Production-ready продукт

---

# 📑 Investor Pitch Version (Short & Aggressive)

## Problem

Автосервизите работят с разпокъсани системи.
Няма централизирана VIN сервизна история.

## Solution

Multi-tenant SaaS платформа с VIN-based shared service history.

## Market

* 300,000+ независими сервиза в ЕС
* SaaS adoption расте

## Business Model

Recurring subscription
Upsell modules
Network effect through VIN sharing

## Competitive Advantage

* Shared VIN layer
* Enterprise-ready architecture
* GDPR compliant

## Vision

Become the "LinkedIn of Service History" за автомобилната индустрия.

---

# 📋 Legal & Terms Model

## 1️⃣ Data Ownership

* Всеки сервиз притежава своите клиентски данни
* Платформата е Data Processor

## 2️⃣ VIN Sharing Terms

* Само сервизни данни
* Без лични данни
* Shared visibility по избор

## 3️⃣ GDPR Compliance

* Right to access
* Right to rectification
* Right to erasure
* Data export (JSON/CSV)

## 4️⃣ Liability Limitation

* Платформата не гарантира точност на въведените от други сервизи данни
* Shared data се предоставя "as-is"

## 5️⃣ Subscription Terms

* Auto-renewal
* 14-day trial (optional)
* Immediate downgrade при неплащане

---

---

---

---

# ⚖️ Backend Технологичен Избор: Express vs Laravel

## 🧠 Въпросът

Кой backend е по-подходящ за SaaS платформа за сервизи?

Възможности:

* Node.js + Express
* Laravel (PHP)

---

## 📊 Сравнение (реалистично за този проект)

| Критерий                   | Laravel                 | Node + Express            |
| -------------------------- | ----------------------- | ------------------------- |
| Authentication             | ⭐⭐⭐⭐⭐ (готово решение)  | ⭐⭐ (трябва да се изгради) |
| Role/Permission система    | ⭐⭐⭐⭐⭐                   | ⭐⭐                        |
| Stripe интеграция          | ⭐⭐⭐⭐⭐ (Laravel Cashier) | ⭐⭐⭐                       |
| Multi-tenant имплементация | ⭐⭐⭐⭐                    | ⭐⭐⭐                       |
| Структура и организация    | Много ясна              | Зависи от архитектурата   |
| Learning curve             | Средна                  | По-гъвкав, но по-хаотичен |
| Бърз старт за SaaS         | ⭐⭐⭐⭐⭐                   | ⭐⭐⭐                       |
| Enterprise readiness       | ⭐⭐⭐⭐⭐                   | ⭐⭐⭐⭐                      |

---

## 🏗️ Как изглежда архитектурата с Laravel

```
[ React / Next Frontend ]
            ↓
[ Laravel API Layer ]
            ↓
[ PostgreSQL / MySQL ]
            ↓
[ Stripe (Cashier) ]
            ↓
[ VIN Shared Logic ]
```

Laravel дава готови инструменти за:

* Authentication (Laravel Breeze / Jetstream)
* Role & Permission пакети
* Subscription управление чрез Cashier
* Миграции на база
* Middleware защити
* Audit логика

---

## 🎯 Кога да изберем Laravel?

* Ако искаме по-бърз старт на SaaS
* Ако приоритет са абонаментите и сигурността
* Ако търсим по-структурирана архитектура
* Ако системата ще се скалира до Enterprise ниво

---

## 🎯 Кога да изберем Express?

* Ако целият екип е JavaScript-базиран
* Ако искаме максимална гъвкавост
* Ако проектът ще има много custom microservices

---

## 🧭 Стратегическо решение

За Startup → Enterprise SaaS за сервизи:

👉 Laravel е по-структурираният и стабилен избор.
👉 Express е по-гъвкав, но изисква повече архитектурна дисциплина.

Изборът трябва да се базира на:

* Екипа
* Дългосрочната визия
* Нивото на сигурност и поддръжка, което искаме да постигнем

---

# 🏗️ System Architecture Diagram (Engineering Level)

## High-Level Cloud Architecture

```
                ┌──────────────────────────┐
                │        End Users         │
                │  (Service Centers Staff) │
                └─────────────┬────────────┘
                              │ HTTPS
                              ↓
                ┌──────────────────────────┐
                │     Frontend (React)     │
                │  Hosted (Vercel / VPS)   │
                └─────────────┬────────────┘
                              │ API Calls
                              ↓
                ┌──────────────────────────┐
                │     Laravel API Layer    │
                │  (Auth, Tenancy, RBAC)   │
                └─────────────┬────────────┘
                              │
          ┌───────────────────┼────────────────────┐
          ↓                   ↓                    ↓
 ┌────────────────┐  ┌────────────────┐   ┌────────────────┐
 │ PostgreSQL DB  │  │ Stripe Webhook │   │  Backup Worker │
 │ Multi-Tenant   │  │ Subscription    │   │  Daily Dumps   │
 └────────────────┘  └────────────────┘   └────────────────┘
                              │
                              ↓
                ┌──────────────────────────┐
                │   VIN Shared Logic Layer │
                │ (Filtered Shared Access) │
                └──────────────────────────┘
```

---

## Logical Layers

### 1️⃣ Presentation Layer

* React UI
* Role-based rendering
* Token-based API calls

### 2️⃣ Application Layer

* Controllers
* Services (Business Logic)
* Middleware (Auth, Tenant, Subscription)

### 3️⃣ Domain Layer

* VIN Sharing Engine
* Subscription Validator
* Audit Logger

### 4️⃣ Data Layer

* PostgreSQL
* Indexed VIN search
* Encrypted backups

---

## Scalability Strategy

Phase 1:

* Single VPS
* Single DB instance

Phase 2:

* Load balancer
* Separate DB server
* Queue worker (Redis)

Phase 3 (Enterprise):

* Horizontal scaling
* Read replicas
* Caching VIN queries

---

# 📈 Go-To-Market Strategy – България

## 🎯 Target сегмент

1️⃣ Малки независими сервизи (1–5 механици)
2️⃣ Средни сервизи (5–15 човека)
3️⃣ Вериги (дългосрочно)

---

## 🚀 Фаза 1 – Ръчно валидиране (0–6 месеца)

* Лични посещения в сервизи
* Демо на място
* 30-дневен безплатен тест
* Събиране на обратна връзка

Цел: 20–30 платени клиента

---

## 📢 Фаза 2 – Онлайн присъствие

* Facebook групи за авто сервизи
* Google Ads по ключови думи:

  * "софтуер за автосервиз"
  * "сервизна история по VIN"
* SEO статии

---

## 🤝 Фаза 3 – Партньорства

* Доставчици на части
* Счетоводни фирми
* Авто застрахователи

---

## 🎯 Positioning Message

"Първата българска мрежа от сервизи със споделена сервизна история по VIN."

---

## 📊 Early KPI Targets

Месец 3:

* 10 платени клиента

Месец 6:

* 50 клиента

Месец 12:

* 150 клиента

---

## 💰 Pricing Strategy за България

* Intro price (6 месеца): -30%
* Referral discount
* 1 месец безплатно при годишен план

---

## 🧠 Long-Term България → ЕС

1️⃣ Валидиране на модела
2️⃣ Добавяне на английски език
3️⃣ Излизане в Румъния / Гърция
4️⃣ ЕС expansion чрез VIN network effect

---

# 🧠 Competitive Moat Анализ (Как продуктът да стане трудно копируем)

## 1️⃣ Network Effect (Основният moat)

Колкото повече сервизи се включват:

* Толкова повече VIN история се натрупва
* Толкова по-ценна става системата
* Толкова по-трудно е нов конкурент да навакса

Стратегия:

* VIN sharing само за активни абонати
* "Network badge" за участващи сервизи
* Стимули за покана на други сервизи (referral credits)

---

## 2️⃣ Data Moat

След 2–3 години:

* Натрупана сервизна история
* Аналитични модели
* Поведенчески данни

Възможност:

* Predictive maintenance insights
* Статистика по марки / модели
* Средна цена на ремонт по регион

Конкурент без тази база няма същата стойност.

---

## 3️⃣ Switching Cost

Повишаване на цената за напускане чрез:

* Интеграция със счетоводство
* Фактуриране
* SMS напомняния
* Вътрешна CRM система

Колкото повече модули използва сервизът,
толкова по-трудно е да мигрира.

---

## 4️⃣ Brand Positioning

Позициониране като:

> "Национален регистър на сервизната история"

Не просто софтуер.
А инфраструктура.

---

## 5️⃣ Regulatory Moat

Ако системата стане стандарт за:

* Застрахователи
* Лизингови компании
* Флийт оператори

Тогава конкуренцията трябва да изгради екосистема,
не просто софтуер.

---

# 🏛️ Юридическа Рамка (По-близка до реален договор)

## 1️⃣ Terms of Service (Основни клаузи)

### 1.1 Предмет

Платформата предоставя SaaS услуга за управление на сервизна история.

### 1.2 Статут на данните

* Всеки сервиз е Data Controller за своите клиентски данни.
* Платформата е Data Processor.

### 1.3 VIN Shared Data

* Споделяната информация включва само:

  * Дата
  * Описание
  * Цена
* Лични данни не се споделят.

### 1.4 Отговорност

* Платформата не носи отговорност за неверни въведени данни.
* Данните се предоставят "as-is".

---

## 2️⃣ Data Processing Agreement (DPA)

Задължителни елементи:

* Описание на обработваните данни
* Срок на съхранение
* Мерки за сигурност
* Право на одит

---

## 3️⃣ GDPR Compliance Clauses

### Right to Access

Потребителят може да експортира данните си.

### Right to Erasure

Анонимизация при искане.

### Data Portability

CSV / JSON export.

---

## 4️⃣ Subscription Terms

* Автоматично подновяване
* Фактуриране предварително
* Спиране при неплащане след 7 дни
* Няма възстановяване за изминал период

---

## 5️⃣ Limitation of Liability

Максималната отговорност на платформата
се ограничава до размера на платения абонамент за последните 12 месеца.

---

## 6️⃣ Jurisdiction

* Приложимо право: Българско право
* Спорове: Компетентен съд в България

---

## 7️⃣ Enterprise Addendum

За Enterprise клиенти:

* Custom SLA
* Dedicated support
* Data residency option

---

# 💼 Founder Execution Roadmap (Bootstrapped – Без външен капитал)

## 🎯 Цел: 12 месеца до устойчив SaaS с положителен cash flow

---

## Фаза 1 – Валидиране (Месец 1–2)

### Действия:

* Лични срещи с 20+ сервиза
* Демонстрационен прототип
* Събиране на реални проблеми
* Потвърждение на willingness-to-pay

### KPI:

* 5 сервиза готови да платят

Без перфекционизъм. Само валидиране.

---

## Фаза 2 – MVP (Месец 3–5)

### Фокус:

* Customers
* Vehicles
* Service Records
* Basic Reports
* Subscription (Stripe)

### Стратегия:

* 10 beta клиента
* Намалена цена срещу обратна връзка

Цел: €1,000–€2,000 MRR

---

## Фаза 3 – Product-Market Fit (Месец 6–9)

### Добавяне на:

* VIN sharing
* Audit logs
* Basic automation

### Действия:

* Referral програма
* Case studies
* Видео демо

Цел: 50+ клиента
MRR: €3,000–€5,000

---

## Фаза 4 – Устойчив растеж (Месец 10–12)

* SEO съдържание
* Платени реклами
* Партньорства
* Процес по onboarding

Цел: 100+ клиента
MRR: €8,000+

---

## 💰 Bootstrapping Принципи

* Без офис
* Без голям екип
* Един backend + един frontend
* Cloud разходи под €150/месец

Фокус: MRR, не vanity metrics.

---

# 📈 Exit Strategy Сценарии

## 1️⃣ Strategic Acquisition

Потенциални купувачи:

* ERP компании
* Счетоводен софтуер
* Авто застрахователи
* Parts distributors

Търсят:

* Активна клиентска база
* Повтарящ се приход (ARR)
* Network effect

Exit при 5–8× ARR.

---

## 2️⃣ Roll-up Strategy

Продажба на регионален играч
който консолидира пазара.

---

## 3️⃣ Cash-Flow Business

Без exit.

Цел:

* 300+ клиента
* €20k+ MRR
* Lean екип

Founder income > €10k/месец.

---

## 4️⃣ Expansion → Series A

Ако VIN network се разрасне в ЕС:

* Raise VC
* Разширяване в 5 държави
* API ecosystem

---

# 🧠 Стратегически Избор

Bootstrapped SaaS дава:

* Контрол
* Equity 100%
* По-бавен, но устойчив растеж

VC-backed дава:

* По-бързо скалиране
* По-висок риск
* Размиване на собственост

---
