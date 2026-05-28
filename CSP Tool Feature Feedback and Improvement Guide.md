# Feedback and Configuration Requests for the New CSP Tool

> This document summarizes requested improvements and configuration changes for the new CSP tool, based on comparison with current workflows in ChurnZero. Each step outlines a specific enhancement or issue to be addressed.

---

### Step 1: Enable Custom Columns and Saved Views

The tool should support fully configurable columns similar to ChurnZero. All data points available in ChurnZero should be exposed as selectable columns in the new CSP tool, with the ability for users to choose which columns to display and save these selections as reusable custom views, rather than relying on a fixed column set.

![Screenshot 1](images/image1.jpg)

---

### Step 2: Fix and Enhance Filtering Functionality

Filtering is currently not working as expected. For example, when a user tries to filter by their own name and then clicks the Filters button, no filtering is applied and the sentiment and other fields remain unchanged.

![Screenshot 2](images/image2.jpg)
![Screenshot 7](images/image3.jpg)

This needs to be fixed so that all filters (including by owner, sentiment, and other attributes) apply correctly and reliably.

---

### Step 3: Support Multiple Roles per Contact and Refine Role List

Within a customer account (e.g., Checkfront), when navigating to Contacts and adding a new contact, the system currently allows selection of only one role.

![Screenshot 8](images/image4.jpg)
![Screenshot 12](images/image5.jpg)

A single person can hold multiple roles (for example, both Champion and Executive Sponsor). The role model should allow multiple roles per contact. Additionally, there appears to be overlap between some roles (e.g., Technical Lead vs. Admin, Economic Buyer vs. Executive Sponsor).

![Screenshot 13](images/image6.jpg)

It is recommended to reuse or align with the contact roles defined in ChurnZero, which are reported to be working well.

---

### Step 4: Add CSM Pulse Notes to Justify Risk Levels

For CSM pulse settings, there is currently only an option to update the pulse value (e.g., Some Risk, High Risk) without a dedicated place to add contextual notes.

![Screenshot 14](images/image7.jpg)
![Screenshot 16](images/image8.jpg)

A “Pulse Notes” field should be added so CSMs can explain why an account is marked as Some Risk or High Risk. This will help leadership quickly understand the rationale behind the risk status.

---

### Step 5: Provide a Clear Sign-Out Option

There is currently no visible or working way to sign out of the application. When the user clicks the profile/menu area, it only navigates to the dashboard, and other clickable elements (including the logo) do not initiate a sign-out.

![Screenshot 17](images/image9.jpg)
![Screenshot 25](images/image10.jpg)

A clear, functional sign-out option should be added so users can log out and then log into another account (for example, to connect integrations from their own account).

---

### Step 6: Provide Personal Account Access for Integration and Notes Testing

The current environment is a test account (e.g., with a test email domain), which prevents the user from connecting Granula and verifying how notes flow into the system.

![Screenshot 26](images/image11.jpg)

When the user navigates to Integrations to perform setup (such as creating a Slack label and completing the integration configuration), these actions are blocked by the limitations of the test account.

![Screenshot 27](images/image12.jpg)
![Screenshot 28](images/image13.jpg)

Providing the user with access to their personal/real account is requested so they can connect Granula, configure integrations, and validate how notes appear end-to-end.

---

### Step 7: Enable Attachments at the Account Level

Currently, there is no clear way to attach files. In ChurnZero, there was a dedicated place to upload attachments. In the new tool, there is an Import option, but it appears to operate at a global level, not at the individual account level where it is needed.

![Screenshot 29](images/image14.jpg)
![Screenshot 30](images/image15.jpg)

An account-level attachment feature should be added so documents can be associated with specific customer accounts rather than only through a global import mechanism.

---

### Step 8: Review and Test Projects and Tasks

Projects functionality has not yet been fully evaluated.

![Screenshot 31](images/image16.jpg)
![Screenshot 32](images/image17.jpg)

There is at least one test project visible, but tasks and overall look-and-feel still need to be explored. Follow-up testing will be done over time to assess how projects and tasks behave in real usage.

## Dashboard - **Clickable widgets**: Dashboard stats (e.g. "11 accounts in churn risk") should be clickable to drill down into the detailed account list - **Individual CSM dashboards**: Separate logins per CSM to enable account-level filtering; currently blocked by shared username/password ## Task Management - **Internal task assignment**: Ability to assign tasks to internal team members - **External task assignment**: Ability to assign tasks to customer champions - **Task dependencies**: Link tasks together and create blocking/dependency relationships (similar to Rocket Lane) - **Comments/threads on tasks**: Enable follow-up discussions directly on a task - **Tasks within projects**: Tasks created inside a project should auto-assign to that project and also reflect in the main task dashboard ## Project Management - **Customer-shareable project tracker**: External-facing project plans with Gantt chart view (similar to Rocket Lane) - **AI-powered task auto-updates**: System detects task completion triggers from call recordings and auto-updates task status - **Manual review before AI updates**: Centralized review section where CSMs can approve/reject AI-suggested task changes before they are applied