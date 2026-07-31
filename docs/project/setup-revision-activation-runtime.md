# Setup revision activation runtime

`@monitor/setup-activation` activates one persisted setup-definition revision only from explicit
caller input. It derives the setup and family selectors from the revision and delegates all
activation validation, supersession, and mutation-record persistence to the domain handoff.

It does not infer activations, schedule them, edit revisions, or execute trading actions.
