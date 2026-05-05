# Firebase Security Specification - Synapse AI

## Data Invariants
1. **User Profiles**: Only the owner can read or write their own user profile.
2. **Workout Plans**: Only the owner can read or write their own workout plans. The `userId` must match the document ID and the authenticated user.
3. **Workout History**: A workout session must belong to the authenticated user. Users can only read their own workout logs. Owners can create and delete their logs, but not update them (immutability).

## The Dirty Dozen Payloads

| ID | Collection | Action | Payload / Scenario | Expected Result |
|----|------------|--------|-------------------|-----------------|
| 1 | `users` | create | Creating profile for another `userId` | DENIED |
| 2 | `users` | update | Updating `createdAt` timestamp | DENIED |
| 3 | `users` | get | Reading another user's profile | DENIED |
| 4 | `workouts` | create | Creating workout with another user's `userId` | DENIED |
| 5 | `workouts` | list | Listing workouts without `where userId == auth.uid` | DENIED |
| 6 | `workouts` | update | Attempting to change an existing workout log | DENIED |
| 7 | `workouts` | create | Injecting 2MB string into exercise name | DENIED |
| 8 | `workoutPlans` | update | Overwriting another user's plan | DENIED |
| 9 | `users` | delete | Random user deleting a profile | DENIED |
| 10 | `workouts` | create | Set with negative weight | DENIED |
| 11 | `workouts` | create | Workout without mandatory `userId` field | DENIED |
| 12 | `workouts` | list | Authenticated user trying to scrape all workouts | DENIED |

## Test Runner Logic (Conceptual)
The `firestore.rules.test.ts` will verify these scenarios using the Firebase Rules Unit Testing library.

1. `test('should deny non-owners from reading profiles')`
2. `test('should deny updates to workout logs')`
3. `test('should enforce strict schema on workout creation')`
