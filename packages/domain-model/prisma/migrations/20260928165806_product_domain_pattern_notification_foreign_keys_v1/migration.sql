ALTER TABLE "product_domain"."pattern_notification"
  ADD CONSTRAINT "pattern_notification_signal_candidate_id_fkey"
    FOREIGN KEY ("signal_candidate_id")
    REFERENCES "product_domain"."signal_candidate"("signal_candidate_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "pattern_notification_setup_definition_id_fkey"
    FOREIGN KEY ("setup_definition_id")
    REFERENCES "product_domain"."setup_definition"("setup_definition_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "pattern_notification_setup_revision_id_fkey"
    FOREIGN KEY ("setup_revision_id")
    REFERENCES "product_domain"."setup_definition_revision"("setup_definition_revision_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "pattern_notification_monitored_symbol_id_fkey"
    FOREIGN KEY ("monitored_symbol_id")
    REFERENCES "product_domain"."monitored_symbol"("monitored_symbol_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "pattern_notification_setup_aggregate_result_id_fkey"
    FOREIGN KEY ("setup_aggregate_result_id")
    REFERENCES "product_domain"."setup_aggregate_result"("setup_aggregate_result_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
