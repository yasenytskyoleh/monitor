# Review Decision To Action Map

## First routing table
`accepted` + `prepare_lifecycle_mutation_follow_up`
- target: `apply_setup_lifecycle_mutation`
- downstream command family: `ApplyApprovedSetupMutationCommand`

`accepted` + `prepare_refinement_follow_up`
- target: `create_setup_refinement_request`
- downstream command family: `CreateSetupRefinementRequestCommand`

`accepted` + `prepare_activation_follow_up`
- target: `activate_setup_revision`
- downstream command family: `ActivateSetupDefinitionRevisionCommand`
- requires `setupRevisionId` context

`accepted` + `confirm_no_change`
- target: `no_op_confirmed`
- downstream command family: `NoOpConfirmed`
- route status: `no_action`

`rejected`
- no executable downstream action
- route status: `no_action`

`revise` + `prepare_refinement_follow_up`
- target: `create_setup_refinement_request`
- downstream command family: `CreateSetupRefinementRequestCommand`

`revise` + any non-refinement action
- rejected (`rejected_lifecycle`)

## Rejection rules
- missing review decision -> `rejected_validation`
- decision/scope mismatch -> `rejected_validation`
- missing authorized action when required -> `rejected_validation`
- outcome/action conflict -> `rejected_lifecycle`
- missing activation context for activation route -> `rejected_lifecycle`

## Explicitly out of scope
- action execution
- queue/retry orchestration
- policy DSL or heuristic route selection
