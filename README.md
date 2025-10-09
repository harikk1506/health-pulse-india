# India's Health Pulse: A National Hospital Infrastructure Digital Twin

Live Demo: [https://india-health-pulse.vercel.app/](https://india-health-pulse.vercel.app/) 

### 1. Core Vision & Problem Statement 🩺

> To create a faithful, data-grounded digital twin of India’s hospital infrastructure to support data-informed decision-making for all citizens.

In a nation as vast as India, access to timely and accurate information about healthcare services is a critical challenge. This "information asymmetry" affects all strata of society, particularly during emergencies when knowing which hospital has available beds can be a matter of life and death.

This project is the practical implementation of the theoretical framework proposed in the preprint manuscript, **"[A Proposal for a Live, Centralized, and Public National Hospital Bed Availability Dashboard](https://www.preprints.org/manuscript/202509.2106/v1)"**. It aims to close this low-hanging policy gap by creating a single, reliable source of truth for hospital capacity. The system is designed to serve everyone—from a family in an emergency to a national policymaker—by providing clear, live, and actionable data.

---

### 2. Project Architecture: A Deep Dive ⚙️

This project is architected as a complete, interconnected ecosystem with a clear flow of data and state. At its heart is a **Dual-Simulation Model** that provides tailored experiences for different stakeholders.

#### 2.1. Core State Management & The Dual-Simulation Model (`App.tsx`)

The application's core in `App.tsx` orchestrates the entire system. It does not use a single, monolithic data source. Instead, it runs two parallel simulation loops to serve different user groups:

1.  **"Calm" Simulation (for Public/Emergency):**
    * A state variable `publicLiveData` is updated every 3 seconds within a `useEffect` hook.
    * This loop calls the simplified `updatePublicMetrics` function from `src/utils/helpers_public.ts`.
    * **Purpose:** To provide a stable, less volatile data stream for public-facing portals, ensuring a clear and understandable user experience without the noise of rapid fluctuations.
    * This data is provided to the `PublicPortal` and `EmergencyPortal` via the `GlobalContext`.

2.  **"Hyper-Dynamic" Simulation (for Hospital/Strategic):**
    * A second state variable, `strategicLiveData`, is updated by subscribing to the sophisticated `simulationEngine.ts`.
    * The engine runs its own independent, high-fidelity simulation loop (`tick()`).
    * **Purpose:** To provide a realistic, complex, and interconnected data model for internal stakeholders who need to see the nuanced effects of system-wide stress.
    * This data is provided to the `HospitalPortal` and `StrategicPortal` via the `StrategicContext`.

This dual-context approach (`GlobalContext`, `StrategicContext`) is a key architectural decision, ensuring that the user experience is perfectly tailored to the stakeholder's needs.

#### 2.2. The Simulation Engines: Logic & Realism

The "beating heart" of the project lies in its simulation logic, designed to create a believable digital twin.

* **`simulationEngine.ts` (Hyper-Dynamic Engine):**
    * **Patient Flow:** The `updateLiveMetrics` function calculates a `netBedChange` by modeling a base admission rate (from `EDThroughput_perDay`) against a base discharge rate (from `ALOS_days`). It then introduces a **random shock factor** and a **"reversion to mean" drift**, pulling the occupancy back towards its realistic baseline over time. This creates a constant, realistic flux in bed availability.
    * **Interconnected KPIs:** Key metrics are not independent. The engine creates a feedback loop where:
        1.  High `occupancyStrain` (percentage of beds filled) increases `staffFatigue_score`.
        2.  High `occupancyStrain` AND high `staffFatigue_score` amplify `currentWaitTime`.
        3.  High `staffFatigue_score` AND long `currentWaitTime` negatively impact `patientSatisfaction_pct`.
    * **Resource Depletion:** The engine models the consumption of `oxygen_supply_days` based on the number of occupied ICU and general beds, with a random chance of resupply when stocks are low, simulating real-world supply chain pressures.

* **`helpers_public.ts` (Calm Engine):**
    * This file contains a simpler version of `updateLiveMetrics` that is less volatile. It's designed to show gradual trends rather than the minute-by-minute chaos modeled in the hyper-dynamic engine, making it more suitable for public consumption.

#### 2.3. Component & Portal Breakdown: An Interconnected System

The four portals are not just separate pages; they are distinct interfaces that consume and, in some cases, *influence* the central state.

* `IntroPage.tsx`: The project's front door, which directs users to the appropriate portal based on their role.

* `PublicPortal.tsx`:
    * **Consumes:** `GlobalContext` ("calm" data).
    * **Core Logic:** Primarily focused on user-side filtering, sorting, and searching of the hospital data. It uses `useGeolocation` to find the user's location and calculates distances to all hospitals. The "AI SmartRoute" feature is a client-side scoring algorithm that ranks hospitals based on a weighted combination of distance, bed availability, and other metrics.

* `EmergencyPortal.tsx`:
    * **Consumes:** `GlobalContext` ("calm" data).
    * **Core Logic:** A complex state machine (`missionPhase`) guides the ambulance crew through a mission lifecycle.
    * **System Interaction:** This portal demonstrates inter-portal communication. When the crew pre-alerts a hospital (`handleNotifyHospital`), it calls `setAmbulanceAlert`, a function passed down from `App.tsx`. This state change is then detected by the `HospitalPortal`.

* `HospitalPortal.tsx`:
    * **Consumes:** `StrategicContext` ("hyper-dynamic" data), filtered to its specific hospital ID (`HOSPITAL_ID_CONTEXT = 150`).
    * **Core Logic:** This portal is both a consumer and a *producer* of state.
    * **System Interaction:**
        1.  It listens for `ambulanceAlert` from the `GlobalContext` to display real-time inbound ambulance notifications in its activity feed.
        2.  The "Manual Reporting" view allows a nodal officer to submit overrides for bed capacity and supplies. This calls `setNodalConfigOverride`, which updates the state in `App.tsx`. `App.tsx` then pushes this new configuration directly into the `simulationEngine`, influencing its calculations for the next tick. This completes a crucial human-in-the-loop feedback cycle.

* `StrategicPortal.tsx`:
    * **Consumes:** `StrategicContext` (the full, unfiltered "hyper-dynamic" data).
    * **Core Logic:** This is the 10,000-foot view of the entire system. It calculates national-level aggregate KPIs from the raw `liveData` and `nationalHistory` streams.
    * **System Interaction:** This portal has the highest level of system influence. A director can declare a Mass Casualty Incident (`setMciState`). This state change flows up to `App.tsx` and is injected into the `simulationEngine`, which then applies stress factors (increased admissions) to all hospitals within the selected region.

This architecture ensures that actions taken in one portal have realistic, cascading effects throughout the entire digital twin, demonstrating a deep understanding of complex health systems.

---

### 6. Data Foundation & Methodology 📊

The foundation of this project is a robust dataset of **150 hospitals** across India's five distinct zones, contained in `src/data/hospitals.json`. The creation of this dataset was a rigorous, **28-hour manual process** to ensure the highest possible fidelity.

1.  **Data Sourcing:** Initial data points were gathered from a variety of sources, including official hospital websites, public health directories, and credible newspaper articles corroborating metrics like patient throughput and wait times.
2.  **Manual Verification:** Each data point was painstakingly cross-referenced and validated. This involved:
    * Verifying exact hospital names and addresses.
    * Using Google Maps to confirm geographic coordinates and Google Ratings.
    * Analyzing government tender documents to estimate resource availability for public hospitals, with logical adjustments made for private institutions.

---

### 7. Scalability and Future Roadmap 🚀

This project is architected as a scalable proof-of-concept. With a dedicated backend and integration into national health IT infrastructure, it could become a powerful tool for public good. The future vision includes:

* **Phase 1: Centralized Backend & Pilot Programs:**
    * Develop a centralized backend to process and store live data.
    * Establish APIs to integrate directly with the billing and IT systems of hospitals, automating bed status updates (e.g., a new registration fills a bed; a cleared bill frees one).
    * Launch pilot programs on a zonal or city-wide basis to refine the system before a national rollout to all 70,000+ registered hospitals.
* **Phase 2: Symptomatic Health Alerts:**
    * Leverage historical data to identify trends. A persistent **85%+ bed occupancy rate** in a specific zone could act as an early warning for an underlying health crisis, triggering investigation.
    * Monitor resource depletion rates. A faster-than-usual consumption of oxygen or PPE can signal a surge, allowing hospitals and policymakers to react proactively based on alerts from the portal.
* **Phase 3: Full National Integration & Mobile App:**
    * Expand the system to encompass all registered hospitals in India.
    * Develop dedicated mobile applications for both the Public and Emergency portals to ensure maximum accessibility for citizens and first responders.

### Tech Stack

* **Frontend:** React, Vite, TypeScript
* **Styling:** Tailwind CSS
* **State Management:** React Context API
* **Internationalization (i18n):** Support for English and Hindi via a custom `useTranslations` hook.

### Disclaimer

This is a proof-of-concept simulation. While based on verified data as of October 2, 2025, the live metrics are generated by a simulation engine. It should be considered an indicator of system dynamics and not a source of absolute truth for real-time decision-making.

---

*This project is my contribution to the vision of a data-driven public health ecosystem in India. All feedback and suggestions are welcome.*
