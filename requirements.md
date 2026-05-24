# Subscription Model Requirements - Installment Management System (IMS)

This document outlines the proposed subscription model for the IMS application to enable monetization on the Google Play Store.

## 1. Subscription Tiers

| Tier | Duration | Features | Targeted Value |
| :--- | :--- | :--- | :--- |
| **Standard (Free)** | Lifetime | Local data only, manual Google Drive backups. | Basic utility. |
| **IMS Pro (Monthly)** | 1 Month | Automated Cloud Sync, Multi-device access, Unlimited clients. | Professional daily users. |
| **IMS Elite (Yearly)** | 1 Year | Everything in Pro + Priority Support + Custom Branding. | Established businesses (Save 20%). |

## 2. Technical Integration (Google Play Billing)

To implement this on the Play Store, we will use the **Expo In-App Purchases** API or **RevenueCat** (recommended for cross-platform stability).

### Requirements from Google Play Console:
1.  **Merchant Account:** Must be active and linked to the Play Console.
2.  **Product IDs:** We need to create two "Subscription" products in the console:
    *   `ims_pro_monthly`
    *   `ims_elite_yearly`
3.  **Real-Time Developer Notifications (RTDN):** To handle renewals and cancellations instantly.

## 3. User Experience (UX) Flow
1.  **Paywall Screen:** A premium Navy/Gold screen showing the benefits.
2.  **Purchase Logic:** One-tap purchase via Google Play popup.
3.  **Entitlement Check:** App verifies active subscription on every launch via Firebase/Play Store API.

## 4. UI/UX Rules
- **Strict Palette:** Maintain Navy (`#1B2A4A`) and Gold (`#D4A340`) exclusively.
- **Premium Feel:** Use glassmorphism and subtle animations for the upgrade screen.

---
**Next Step:** Once you approve this model, I will create the implementation plan for the native code integration.
