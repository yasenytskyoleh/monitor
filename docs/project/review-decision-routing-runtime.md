# Review-decision routing runtime

`@monitor/review-decision-routing` resolves one recorded human review decision and delegates its
persisted facts to the domain routing service. Routing policy remains domain-owned; this runtime
does not create decisions, execute targets, or add a scheduler.
