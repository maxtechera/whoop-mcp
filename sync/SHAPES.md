# WHOOP data shapes (auto-derived by `whoop-sync discover`)

> Generated from live API responses. Drives the `whoop` schema DDL and the zero-loss path-coverage audit.
> Arrays (marked `[]`) are the time-series/repeated structures decomposed into granular child tables.

## Granularity ceiling
Finest grain WHOOP exposes: per-workout HR curve (`workout_detail`), 15-min stress buckets (`stress`), per-stage sleep hypnogram (`sleep`). No per-second whole-day HR/SpO2/respiratory series exists — zero-loss = every byte the API returns is persisted in Tier-1 raw.

## `bootstrap`  (1 sample)

**Arrays → child tables:**
- `teams[]` (max len 0) → fields: (scalar/nested)

**Scalar fields (→ columns):**
- `account.id`: number
- `account.username`: string
- `account.email`: string
- `account.type`: string
- `account.can_upload_data`: boolean
- `account.deidentified`: boolean
- `account.concealed`: boolean
- `account.disabled`: boolean
- `account.tos_accepted`: string
- `account.created_at`: string
- `account.updated_at`: string
- `account.user_id`: number
- `account.staff_id`: null
- `user.id`: number
- `user.first_name`: string
- `user.last_name`: string
- `user.country`: string
- `user.created_at`: string
- `user.updated_at`: string
- `user.avatar_url`: null
- `user.city`: null
- `user.admin_division`: null
- `staff`: null
- `profile.user_id`: number
- `profile.bio_data_id`: number
- `profile.height`: number
- `profile.weight`: number
- `profile.gender`: string
- `profile.unit_system`: string
- `profile.fitness_level`: string
- `profile.birthday`: string
- `profile.created_at`: string
- `profile.updated_at`: string
- `profile.timezone_offset`: string
- `profile.physiological_baseline`: null
- `membership.status`: string
- `membership.in_effect`: boolean
- `bio_data.max_heart_rate`: number
- `bio_data.min_heart_rate`: number
- `bio_data.resting_heart_rate`: number
- `bio_data.recovery_count`: number

## `cycle`  (0 samples, errors: Whoop API error 400 on /womens-health-service/v1/menstrual-cycle-insights: User has no contraception status)

## `hidden_body_comp`  (1 sample)

**Scalar fields (→ columns):**
- `is_hidden`: boolean

## `hidden_healthspan`  (1 sample)

**Scalar fields (→ columns):**
- `is_hidden`: boolean

## `home`  (3 samples)

**Arrays → child tables:**
- `metadata.autopop_metadata.destinations[]` (max len 0) → fields: (scalar/nested)
- `metadata.ai_context_metadata.bottom_nav_overrides[]` (max len 5) → fields: type, screen_identifier
- `metadata.experiment_ids[]` (max len 0) → fields: (scalar/nested)
- `header.content.gauges[]` (max len 3) → fields: title, title_end_icon, id, score_display, score_display_style, score_display_suffix, gauge_fill_percentage, score_target, lower_optimal_percentage, higher_optimal_percentage, progress_fill_style, bar_styles
- `pillars[]` (max len 1) → fields: display_name, type
- `pillars[].sections[]` (max len 5) → fields: id, section_type
- `pillars[].sections[].items[]` (max len 11) → fields: type
- `pillars[].sections[].items[].content.header.android_cta_feature_flags[]` (max len 1) → fields: (scalar/nested)
- `pillars[].sections[].items[].content.header.ios_cta_feature_flags[]` (max len 1) → fields: (scalar/nested)
- `pillars[].sections[].items[].content.items[]` (max len 2) → fields: type
- `pillars[].sections[].items[].content.footer_items[]` (max len 1) → fields: type
- `pillars[].sections[].items[].content.graph.plane.lines[]` (max len 6) → fields: position, axis, type, style, label, label_style
- `pillars[].sections[].items[].content.graph.plane.start_yaxis.labels[]` (max len 4) → fields: label, position, style, sub_label, id
- `pillars[].sections[].items[].content.graph.plane.end_yaxis.labels[]` (max len 4) → fields: label, position, style, sub_label, id
- `pillars[].sections[].items[].content.graph.plane.bottom_xaxis.labels[]` (max len 7) → fields: label, position, style, sub_label, id
- `pillars[].sections[].items[].content.graph.plane.annotations[]` (max len 1) → fields: width, height, type, dimension, style, label, sub_label, label_style, alignment, xposition, yposition
- `pillars[].sections[].items[].content.graph.plots[]` (max len 2) → fields: type
- `pillars[].sections[].items[].content.graph.plots[].plot.segments[]` (max len 1) → fields: style
- `pillars[].sections[].items[].content.graph.plots[].plot.segments[].points[]` (max len 297) → fields: visible, position_x, position_y, style, accessibility_label, details, data_scrubber_details
- `pillars[].sections[].items[].content.graph.plots[].plot.overlay_group_list[]` (max len 2) → fields: type
- `pillars[].sections[].items[].content.graph.plots[].plot.overlay_group_list[].label.overlay_label_cta_content[]` (max len 0) → fields: (scalar/nested)
- `pillars[].sections[].items[].content.graph.plots[].plot.overlay_group_list[].overlay_list[]` (max len 1) → fields: style, position_x, height, width, accessibility_label
- `pillars[].sections[].items[].content.sub_items[]` (max len 0) → fields: (scalar/nested)
- `pillars[].sections[].items[].content.graph_legends[]` (max len 0) → fields: (scalar/nested)

**Scalar fields (→ columns):**
- `metadata.cycle_metadata.cycle_id`: number
- `metadata.cycle_metadata.cycle_day`: string
- `metadata.cycle_metadata.cycle_days.lower_endpoint`: string
- `metadata.cycle_metadata.cycle_days.lower_bound_type`: string
- `metadata.cycle_metadata.cycle_days.upper_endpoint`: string
- `metadata.cycle_metadata.cycle_days.upper_bound_type`: string
- `metadata.cycle_metadata.during.lower_endpoint`: string
- `metadata.cycle_metadata.during.lower_bound_type`: string
- `metadata.cycle_metadata.during.upper_endpoint`: string
- `metadata.cycle_metadata.during.upper_bound_type`: string
- `metadata.cycle_metadata.cycle_date_display`: string
- `metadata.cycle_metadata.previous_cycle_day`: string
- `metadata.cycle_metadata.next_cycle_day`: string
- `metadata.cycle_metadata.multi_day_cycle`: boolean
- `metadata.cycle_metadata.has_multi_day_cycle_cta_tile`: boolean
- `metadata.cycle_metadata.sleep_state`: string
- `metadata.cycle_metadata.day_zero`: boolean
- `metadata.journal_metadata.journal_completed`: boolean
- `metadata.journal_metadata.has_recovery`: boolean
- `metadata.journal_metadata.has_cycle`: boolean
- `metadata.journal_metadata.journal_enabled`: boolean
- `metadata.journal_metadata.display_cycle_state`: string
- `metadata.journal_metadata.should_auto_pop`: boolean
- `metadata.journal_metadata.previous_cycle_during.lower_endpoint`: string
- `metadata.journal_metadata.previous_cycle_during.lower_bound_type`: string
- `metadata.journal_metadata.previous_cycle_during.upper_endpoint`: string
- `metadata.journal_metadata.previous_cycle_during.upper_bound_type`: string
- `metadata.journal_metadata.has_enough_recoveries`: boolean
- `metadata.user_metadata.avatar_url`: string
- `metadata.user_metadata.profile_raf_destination`: null
- `metadata.whoop_live_metadata.day_strain`: number
- `metadata.whoop_live_metadata.recovery_score`: number
- `metadata.whoop_live_metadata.ms_of_sleep`: number
- `metadata.whoop_live_metadata.calories`: number
- `metadata.autopop_metadata.test_variant`: boolean
- `metadata.ai_context_metadata.is_wce_enabled`: boolean
- `metadata.ai_context_metadata.onboarding_education`: null
- `header.content.id`: string
- `header.content.header_item`: null
- `header.type`: string
- `day_one_transition`: null

## `hr_zone_settings`  (1 sample)

**Arrays → child tables:**
- `heart_rate_entry_row[]` (max len 2) → fields: label, id, value, units, editable, min_value, max_value
- `default_hr_zones[]` (max len 5) → fields: style, label, id, min, max
- `manual_heart_rate_zones_form.zone_rows[]` (max len 5) → fields: style, label, id, min, max

**Scalar fields (→ columns):**
- `screen_title`: string
- `introduction.title`: string
- `introduction.body`: string
- `manual_heart_rate_zones_form.toggle_value`: boolean
- `manual_heart_rate_zones_form.title`: string
- `manual_heart_rate_zones_form.subtitle`: string
- `manual_heart_rate_zones_form.zone_column_title`: string
- `manual_heart_rate_zones_form.zone_min_column_title`: string
- `manual_heart_rate_zones_form.zone_max_column_title`: string
- `manual_heart_rate_zones_form.units`: string

## `hr_zones`  (1 sample)

**Arrays → child tables:**
- `zones[]` (max len 6) → fields: id, min, max

**Scalar fields (→ columns):**
- `effective_timestamp`: null
- `max_hr_entry_field`: null

## `journal`  (3 samples)

**Arrays → child tables:**
- `journal.tracked_behaviors[]` (max len 10) → fields: (scalar/nested)
- `journal.tracked_behaviors[].behavior_tracker.magnitude.choices[]` (max len 3) → fields: value, label

**Scalar fields (→ columns):**
- `integrations`: null
- `journal.user_id`: number
- `journal.cycle_id`: number
- `journal.journal_entry_id`: number
- `journal.notes`: null
- `journal.user_reviewed`: boolean
- `metadata.sleep_during.lower_endpoint`: string
- `metadata.sleep_during.lower_bound_type`: string
- `metadata.sleep_during.upper_endpoint`: string
- `metadata.sleep_during.upper_bound_type`: string
- `metadata.journal_bounds.current_cycle_sleep_lower`: string
- `metadata.journal_bounds.next_cycle_sleep_lower`: string
- `metadata.show_gradient`: boolean
- `metadata.header_text`: string
- `metadata.subtitle_callout`: null
- `metadata.date_picker.title`: string
- `metadata.date_picker.next_day.cycle_id`: number
- `metadata.date_picker.next_day.date`: string
- `metadata.date_picker.previous_day.cycle_id`: number
- `metadata.date_picker.previous_day.date`: string
- `metadata.button`: null
- `experiment_variant`: string

## `lift_prs`  (1 sample)

**Arrays → child tables:**
- `tiles[]` (max len 10) → fields: translated_muscle_groups, created_at, updated_at, custom_exercise_info, volume_input_value, volume_input_units, exercise_id, name, push_core_name, trackable, equipment, translated_equipment, exercise_type, laterality, movement_pattern, translated_movement_pattern, deleted, image_url, video_url, volume_input_format, custom_exercise
- `tiles[].training_types[]` (max len 0) → fields: (scalar/nested)
- `tiles[].instructions[]` (max len 1) → fields: (scalar/nested)
- `tiles[].muscle_groups[]` (max len 1) → fields: (scalar/nested)

**Scalar fields (→ columns):**
- `show_more`: boolean
- `next_exercise_offset`: number
- `next_end_date`: string
- `next_start_date`: string

## `recovery`  (3 samples)

**Arrays → child tables:**
- `sections[]` (max len 4) → fields: id, section_type
- `sections[].items[]` (max len 1) → fields: type
- `sections[].items[].content.metrics[]` (max len 4) → fields: id, icon, title, status, status_subtitle, metric_style, status_icon, status_type, bar_styles
- `sections[].items[].content.tile_legend.content.icons[]` (max len 2) → fields: icon, type
- `sections[].items[].content.footer.items[]` (max len 1) → fields: type

**Scalar fields (→ columns):**
- `metadata.ai_context_metadata.is_wce_prefetch`: null
- `metadata.ai_context_metadata.is_wce_enabled`: boolean
- `metadata.ai_context_metadata.destination.screen`: string
- `metadata.ai_context_metadata.destination.parameters.fingerprint`: string
- `metadata.ai_context_metadata.destination.parameters.source`: string
- `metadata.ai_context_metadata.destination.parameters.screen_id`: string
- `metadata.ai_context_metadata.destination.parameters.source_type`: string
- `metadata.ai_context_metadata.destination.parameters.source_id`: string
- `metadata.ai_context_metadata.destination.parameters.agent_id`: string
- `metadata.ai_context_metadata.destination.parameters.preset_question_key`: null
- `metadata.ai_context_metadata.destination.parameters.static_initial_message`: null
- `metadata.ai_context_metadata.destination.parameters.education_type`: null
- `metadata.ai_context_metadata.destination.parameters.should_open_full_size`: boolean
- `metadata.ai_context_metadata.destination.parameters.args.context`: string
- `metadata.ai_context_metadata.ai_action.source`: string
- `metadata.ai_context_metadata.ai_action.screen_id`: string
- `metadata.ai_context_metadata.ai_action.source_type`: string
- `metadata.ai_context_metadata.ai_action.source_id`: string
- `metadata.ai_context_metadata.ai_action.args.context`: string
- `metadata.ai_context_metadata.ai_action.should_open_full_size`: boolean
- `metadata.ai_context_metadata.ai_action.education_type`: null
- `metadata.ai_context_metadata.ai_action.fingerprint`: string
- `metadata.ai_context_metadata.ai_action.agent_id`: string
- `metadata.ai_context_metadata.ai_action.static_initial_message`: null
- `metadata.ai_context_metadata.ai_action.entry_text`: null
- `metadata.ai_context_metadata.ai_action.include_initial_message`: null
- `metadata.ai_context_metadata.ai_action.conversation_seed_id`: null
- `metadata.ai_context_metadata.ai_action.preset_question`: null
- `metadata.ai_context_metadata.ai_action.onboarding_analytic_source`: null
- `metadata.ai_context_metadata.ai_action.entrypoint_experience`: string
- `metadata.ai_context_metadata.screen_identifier`: string
- `header.title`: string
- `header.end_icon`: null
- `header.end_item.content.path`: string
- `header.end_item.type`: string
- `header.deep_dive_score_type`: string
- `header.destination.screen`: string
- `header.destination.parameters.feature_education_name`: string
- `header.destination.parameters.source`: null

## `sleep`  (3 samples)

**Arrays → child tables:**
- `sections[]` (max len 5) → fields: id, section_type
- `sections[].items[]` (max len 1) → fields: type
- `sections[].items[].content.arrow_stat[]` (max len 1) → fields: current_stat_text, historic_stat_text, historic_stat_alignment, trend_state
- `sections[].items[].content.graph_legends[]` (max len 1) → fields: graph_legend_style, icon, legend_text
- `sections[].items[].content.card_content[]` (max len 5) → fields: type
- `sections[].items[].content.card_content[].content.plane.start_yaxis.labels[]` (max len 5) → fields: label, position, style, sub_label, id
- `sections[].items[].content.card_content[].content.plane.end_yaxis.labels[]` (max len 0) → fields: (scalar/nested)
- `sections[].items[].content.card_content[].content.plane.bottom_xaxis.labels[]` (max len 5) → fields: label, position, style, sub_label, id
- `sections[].items[].content.card_content[].content.plane.lines[]` (max len 6) → fields: position, axis, type, style, label, label_style
- `sections[].items[].content.card_content[].content.plots[]` (max len 5) → fields: type
- `sections[].items[].content.card_content[].content.plots[].plot.segments[]` (max len 21) → fields: style
- `sections[].items[].content.card_content[].content.plots[].plot.segments[].points[]` (max len 623) → fields: visible, position_x, position_y, style, accessibility_label, details, graph_label
- `sections[].items[].content.card_content[].content.plots[].plot.bar_groups[]` (max len 5) → fields: position_x, width, accessibility_label, details, data_scrubber_details
- `sections[].items[].content.card_content[].content.plots[].plot.bar_groups[].bars[]` (max len 1) → fields: position_y, height, style, data_scrubber_details
- `sections[].items[].content.card_content[].content.plots[].plot.overlay_group_list[]` (max len 1) → fields: type
- `sections[].items[].content.card_content[].content.plots[].plot.overlay_group_list[].label.overlay_label_cta_content[]` (max len 0) → fields: (scalar/nested)
- `sections[].items[].content.card_content[].content.plots[].plot.overlay_group_list[].overlay_list[]` (max len 1) → fields: style, position_x, height, width, accessibility_label
- `sections[].items[].content.card_content[].content.heart_rate_zones[]` (max len 4) → fields: bar_graph_tile_title_display, bar_graph_tile_percentage_display, bar_graph_tile_time_display, bar_graph_tile_time_suffix_display, id, tile_style, bar_graph_tile_subtitle_display, show_radio_toggle, hide_background
- `sections[].items[].content.card_content[].content.heart_rate_zones[].bar_graph.time_bound_ranges[]` (max len 21) → fields: lower_endpoint, lower_bound_type, upper_endpoint, upper_bound_type
- `sections[].items[].content.card_content[].content.arrow_stat[]` (max len 1) → fields: current_stat_text, historic_stat_text, historic_stat_alignment, trend_state
- `sections[].items[].content.card_content[].content.bars[]` (max len 2) → fields: title_display, is_title_on_top, value_display
- `sections[].items[].content.card_content[].content.bars[].segments[]` (max len 35) → fields: style, fill_percent
- `sections[].items[].content.card_content[].content.legend_entries[]` (max len 3) → fields: style, legend_display, stat_display

**Scalar fields (→ columns):**
- `header_section.id`: null
- `header_section.title`: string
- `header_section.subtitle`: string
- `header_section.subtitle_end`: null
- `header_section.cta`: null
- `header_section.cta_state`: null
- `header_section.icon`: string
- `header_section.style`: string
- `header_section.destination.screen`: string
- `header_section.destination.parameters.activity_id`: string
- `header_section.destination.parameters.start_time`: string
- `header_section.destination.parameters.end_time`: string
- `header_section.destination.parameters.activity_score_type`: string
- `header_section.destination.parameters.internal_name`: string
- `header_section.destination.parameters.flow`: string
- `header_section.destination.parameters.is_deletable`: boolean
- `header_section.leading_button`: null
- `sub_header_section.sub_header`: string
- `sub_header_section.sub_header_end`: string

## `sleep_need`  (1 sample)

**Scalar fields (→ columns):**
- `turn_off_schedule_modal.modal_title_display`: string
- `turn_off_schedule_modal.modal_subtext_display`: string
- `turn_off_schedule_modal.button_action_display_text`: string
- `turn_off_schedule_modal.dismiss_action_display_text`: string
- `turn_off_all_modal.modal_title_display`: string
- `turn_off_all_modal.modal_subtext_display`: string
- `turn_off_all_modal.button_action_display_text`: string
- `turn_off_all_modal.dismiss_action_display_text`: string
- `chip_label_text_display`: string
- `alarm_schedule_state`: string
- `next_schedule_day_label`: string
- `eligible_for_smart_alarms`: boolean
- `need_breakdown.total`: number
- `need_breakdown.baseline`: number
- `need_breakdown.naps`: number
- `need_breakdown.strain`: number
- `need_breakdown.debt`: number
- `need_breakdown_formatted.total_need`: string
- `need_breakdown_formatted.baseline_need`: string
- `need_breakdown_formatted.naps_need`: string
- `need_breakdown_formatted.strain_need`: string
- `need_breakdown_formatted.debt_need`: string
- `recommended_time_in_bed_formatted.70.recommended_time_in_bed`: number
- `recommended_time_in_bed_formatted.70.optimal_endpoints_formatted.start`: string
- `recommended_time_in_bed_formatted.70.optimal_endpoints_formatted.end`: string
- `recommended_time_in_bed_formatted.70.max_possible_sri`: null
- `recommended_time_in_bed_formatted.70.projected_sleep_consistency`: null
- `recommended_time_in_bed_formatted.70.sleep_adjustment_time_string`: null
- `recommended_time_in_bed_formatted.70.estimated_awake_time_string`: string
- `recommended_time_in_bed_formatted.70.recommended_time_in_bed_time_string`: string
- `recommended_time_in_bed_formatted.70.sleep_need_time_string`: string
- `recommended_time_in_bed_formatted.70.flex_sleep_time`: boolean
- `recommended_time_in_bed_formatted.85.recommended_time_in_bed`: number
- `recommended_time_in_bed_formatted.85.optimal_endpoints_formatted.start`: string
- `recommended_time_in_bed_formatted.85.optimal_endpoints_formatted.end`: string
- `recommended_time_in_bed_formatted.85.max_possible_sri`: null
- `recommended_time_in_bed_formatted.85.projected_sleep_consistency`: null
- `recommended_time_in_bed_formatted.85.sleep_adjustment_time_string`: null
- `recommended_time_in_bed_formatted.85.estimated_awake_time_string`: string
- `recommended_time_in_bed_formatted.85.recommended_time_in_bed_time_string`: string
- `recommended_time_in_bed_formatted.85.sleep_need_time_string`: string
- `recommended_time_in_bed_formatted.85.flex_sleep_time`: boolean
- `recommended_time_in_bed_formatted.100.recommended_time_in_bed`: number
- `recommended_time_in_bed_formatted.100.optimal_endpoints_formatted.start`: string
- `recommended_time_in_bed_formatted.100.optimal_endpoints_formatted.end`: string
- `recommended_time_in_bed_formatted.100.max_possible_sri`: null
- `recommended_time_in_bed_formatted.100.projected_sleep_consistency`: null
- `recommended_time_in_bed_formatted.100.sleep_adjustment_time_string`: null
- `recommended_time_in_bed_formatted.100.estimated_awake_time_string`: string
- `recommended_time_in_bed_formatted.100.recommended_time_in_bed_time_string`: string
- `recommended_time_in_bed_formatted.100.sleep_need_time_string`: string
- `recommended_time_in_bed_formatted.100.flex_sleep_time`: boolean
- `recommended_time_in_bed_formatted.weekly_plan.recommended_time_in_bed`: number
- `recommended_time_in_bed_formatted.weekly_plan.optimal_endpoints_formatted.start`: string
- `recommended_time_in_bed_formatted.weekly_plan.optimal_endpoints_formatted.end`: string
- `recommended_time_in_bed_formatted.weekly_plan.max_possible_sri`: null
- `recommended_time_in_bed_formatted.weekly_plan.projected_sleep_consistency`: number
- `recommended_time_in_bed_formatted.weekly_plan.sleep_adjustment_time_string`: string
- `recommended_time_in_bed_formatted.weekly_plan.estimated_awake_time_string`: string
- `recommended_time_in_bed_formatted.weekly_plan.recommended_time_in_bed_time_string`: string
- … +15 more

## `stealth_mode`  (1 sample)

**Scalar fields (→ columns):**
- `(root)`: boolean

## `strain`  (3 samples)

**Arrays → child tables:**
- `sections[]` (max len 5) → fields: id, section_type
- `sections[].items[]` (max len 1) → fields: type
- `sections[].items[].content.metrics[]` (max len 4) → fields: id, icon, title, status, status_subtitle, metric_style, status_icon, status_type, bar_styles
- `sections[].items[].content.tile_legend.content.icons[]` (max len 2) → fields: icon, type
- `sections[].items[].content.footer.items[]` (max len 1) → fields: type

**Scalar fields (→ columns):**
- `metadata.ai_context_metadata.is_wce_prefetch`: null
- `metadata.ai_context_metadata.is_wce_enabled`: boolean
- `metadata.ai_context_metadata.destination.screen`: string
- `metadata.ai_context_metadata.destination.parameters.fingerprint`: string
- `metadata.ai_context_metadata.destination.parameters.source`: string
- `metadata.ai_context_metadata.destination.parameters.screen_id`: string
- `metadata.ai_context_metadata.destination.parameters.source_type`: string
- `metadata.ai_context_metadata.destination.parameters.source_id`: string
- `metadata.ai_context_metadata.destination.parameters.agent_id`: string
- `metadata.ai_context_metadata.destination.parameters.preset_question_key`: null
- `metadata.ai_context_metadata.destination.parameters.static_initial_message`: null
- `metadata.ai_context_metadata.destination.parameters.education_type`: null
- `metadata.ai_context_metadata.destination.parameters.should_open_full_size`: boolean
- `metadata.ai_context_metadata.destination.parameters.args.context`: string
- `metadata.ai_context_metadata.ai_action.source`: string
- `metadata.ai_context_metadata.ai_action.screen_id`: string
- `metadata.ai_context_metadata.ai_action.source_type`: string
- `metadata.ai_context_metadata.ai_action.source_id`: string
- `metadata.ai_context_metadata.ai_action.args.context`: string
- `metadata.ai_context_metadata.ai_action.should_open_full_size`: boolean
- `metadata.ai_context_metadata.ai_action.education_type`: null
- `metadata.ai_context_metadata.ai_action.fingerprint`: string
- `metadata.ai_context_metadata.ai_action.agent_id`: string
- `metadata.ai_context_metadata.ai_action.static_initial_message`: null
- `metadata.ai_context_metadata.ai_action.entry_text`: null
- `metadata.ai_context_metadata.ai_action.include_initial_message`: null
- `metadata.ai_context_metadata.ai_action.conversation_seed_id`: null
- `metadata.ai_context_metadata.ai_action.preset_question`: null
- `metadata.ai_context_metadata.ai_action.onboarding_analytic_source`: null
- `metadata.ai_context_metadata.ai_action.entrypoint_experience`: string
- `metadata.ai_context_metadata.screen_identifier`: string
- `header.title`: string
- `header.end_icon`: null
- `header.end_item.content.path`: string
- `header.end_item.type`: string
- `header.deep_dive_score_type`: string
- `header.destination.screen`: string
- `header.destination.parameters.feature_education_name`: string
- `header.destination.parameters.source`: null

## `stress`  (3 samples)

**Arrays → child tables:**
- `stress_graph.graph.plane.lines[]` (max len 7) → fields: position, axis, type, style, label, label_style
- `stress_graph.graph.plane.start_yaxis.labels[]` (max len 4) → fields: label, position, style, sub_label, id
- `stress_graph.graph.plane.end_yaxis.labels[]` (max len 0) → fields: (scalar/nested)
- `stress_graph.graph.plane.bottom_xaxis.labels[]` (max len 3) → fields: label, position, style, sub_label, id
- `stress_graph.graph.plots[]` (max len 2) → fields: type
- `stress_graph.graph.plots[].plot.segments[]` (max len 1) → fields: style
- `stress_graph.graph.plots[].plot.segments[].points[]` (max len 742) → fields: visible, position_x, position_y, style, accessibility_label, details, graph_label
- `stress_graph.graph.plots[].plot.overlay_group_list[]` (max len 0) → fields: (scalar/nested)
- `stress_graph.graph.graph_buttons.graph_plane_buttons[]` (max len 1) → fields: id, position_x, position_y, icon
- `stress_graph.sub_items[]` (max len 0) → fields: (scalar/nested)
- `previous_stress_graph.graph.plane.lines[]` (max len 7) → fields: position, axis, type, style, label, label_style
- `previous_stress_graph.graph.plane.start_yaxis.labels[]` (max len 4) → fields: label, position, style, sub_label, id
- `previous_stress_graph.graph.plane.end_yaxis.labels[]` (max len 0) → fields: (scalar/nested)
- `previous_stress_graph.graph.plane.bottom_xaxis.labels[]` (max len 4) → fields: label, position, style, sub_label, id
- `previous_stress_graph.graph.plots[]` (max len 2) → fields: type
- `previous_stress_graph.graph.plots[].plot.segments[]` (max len 1) → fields: style
- `previous_stress_graph.graph.plots[].plot.segments[].points[]` (max len 759) → fields: visible, position_x, position_y, style, accessibility_label, details, graph_label
- `previous_stress_graph.graph.plots[].plot.overlay_group_list[]` (max len 2) → fields: type
- `previous_stress_graph.graph.plots[].plot.overlay_group_list[].label.overlay_label_cta_content[]` (max len 0) → fields: (scalar/nested)
- `previous_stress_graph.graph.plots[].plot.overlay_group_list[].overlay_list[]` (max len 1) → fields: style, position_x, height, width, accessibility_label
- `previous_stress_graph.graph.graph_buttons.graph_plane_buttons[]` (max len 1) → fields: id, position_x, position_y, icon
- `previous_stress_graph.sub_items[]` (max len 0) → fields: (scalar/nested)
- `extended24_hour_graph.graph.plane.lines[]` (max len 6) → fields: position, axis, type, style, label, label_style
- `extended24_hour_graph.graph.plane.start_yaxis.labels[]` (max len 4) → fields: label, position, style, sub_label, id
- `extended24_hour_graph.graph.plane.end_yaxis.labels[]` (max len 0) → fields: (scalar/nested)
- `extended24_hour_graph.graph.plane.bottom_xaxis.labels[]` (max len 3) → fields: label, position, style, sub_label, id
- `extended24_hour_graph.graph.plots[]` (max len 2) → fields: type
- `extended24_hour_graph.graph.plots[].plot.segments[]` (max len 1) → fields: style
- `extended24_hour_graph.graph.plots[].plot.segments[].points[]` (max len 1505) → fields: visible, position_x, position_y, style, accessibility_label, details, graph_label
- `extended24_hour_graph.graph.plots[].plot.overlay_group_list[]` (max len 2) → fields: type
- `extended24_hour_graph.graph.plots[].plot.overlay_group_list[].label.overlay_label_cta_content[]` (max len 0) → fields: (scalar/nested)
- `extended24_hour_graph.graph.plots[].plot.overlay_group_list[].overlay_list[]` (max len 1) → fields: style, position_x, height, width, accessibility_label
- `extended24_hour_graph.graph.graph_buttons.graph_plane_buttons[]` (max len 1) → fields: id, position_x, position_y, icon
- `extended24_hour_graph.sub_items[]` (max len 0) → fields: (scalar/nested)
- `trend_list[]` (max len 3) → fields: title_display, title_suffix_display, vow
- `trend_list[].today_bar_segments[]` (max len 3) → fields: start_x, end_x, style
- `trend_list[].previous_bar_segments[]` (max len 3) → fields: start_x, end_x, style
- `onboarding_carousel.article_list[]` (max len 6) → fields: id, title, image_url, type, size, icon, paragraph, publish_date, sub_text, tag, article_url, border_style, cta

**Scalar fields (→ columns):**
- `metadata.ai_context_metadata.is_wce_prefetch`: null
- `metadata.ai_context_metadata.is_wce_enabled`: boolean
- `metadata.ai_context_metadata.destination.screen`: string
- `metadata.ai_context_metadata.destination.parameters.fingerprint`: string
- `metadata.ai_context_metadata.destination.parameters.source`: string
- `metadata.ai_context_metadata.destination.parameters.screen_id`: string
- `metadata.ai_context_metadata.destination.parameters.source_type`: string
- `metadata.ai_context_metadata.destination.parameters.source_id`: string
- `metadata.ai_context_metadata.destination.parameters.agent_id`: string
- `metadata.ai_context_metadata.destination.parameters.preset_question_key`: null
- `metadata.ai_context_metadata.destination.parameters.static_initial_message`: null
- `metadata.ai_context_metadata.destination.parameters.education_type`: null
- `metadata.ai_context_metadata.destination.parameters.should_open_full_size`: boolean
- `metadata.ai_context_metadata.destination.parameters.args.context`: string
- `metadata.ai_context_metadata.ai_action.source`: string
- `metadata.ai_context_metadata.ai_action.screen_id`: string
- `metadata.ai_context_metadata.ai_action.source_type`: string
- `metadata.ai_context_metadata.ai_action.source_id`: string
- `metadata.ai_context_metadata.ai_action.args.context`: string
- `metadata.ai_context_metadata.ai_action.should_open_full_size`: boolean
- `metadata.ai_context_metadata.ai_action.education_type`: null
- `metadata.ai_context_metadata.ai_action.fingerprint`: string
- `metadata.ai_context_metadata.ai_action.agent_id`: string
- `metadata.ai_context_metadata.ai_action.static_initial_message`: null
- `metadata.ai_context_metadata.ai_action.entry_text`: null
- `metadata.ai_context_metadata.ai_action.include_initial_message`: null
- `metadata.ai_context_metadata.ai_action.conversation_seed_id`: null
- `metadata.ai_context_metadata.ai_action.preset_question`: null
- `metadata.ai_context_metadata.ai_action.onboarding_analytic_source`: null
- `metadata.ai_context_metadata.ai_action.entrypoint_experience`: string
- `metadata.ai_context_metadata.screen_identifier`: string
- `title`: string
- `date_selector.date_text`: string
- `date_selector.previous_button_date`: string
- `date_selector.next_button_date`: string
- `show_connectivity_window`: boolean
- `show_education`: boolean
- `calibration_text_display`: null
- `progress_stepper`: null
- `loading_data`: null
- `stress_state`: string
- `vow.header`: string
- `vow.key`: string
- `vow.text`: string
- `whoop_coach_vow`: null
- `gauge.gauge_score_display`: string
- `gauge.gauge_subtext_display`: string
- `gauge.gauge_min_display`: string
- `gauge.gauge_max_display`: string
- `gauge.gauge_fill_percentage`: number
- `typeform_url`: string
- `last_updated_display`: string
- `stress_graph.stress_graph_state`: string
- `stress_graph.stress_graph_label`: string
- `stress_graph.stress_graph_score`: string
- `stress_graph.size`: string
- `stress_graph.stress_graph_vow_display`: string
- `stress_graph.stress_ctatext`: null
- `stress_graph.title`: string
- `stress_graph.graph.id`: null
- … +96 more

## `trend`  (4 samples)

**Arrays → child tables:**
- `segment_controller.element_names[]` (max len 3) → fields: (scalar/nested)
- `week_time_segment.metrics[]` (max len 1) → fields: trend_key, metric_name_display, metric_value_display, metric_units_display, trend_direction, trend_style, trend_text_display, current_metric_value, previous_metric_value, metric_change
- `week_time_segment.graph.plane.lines[]` (max len 5) → fields: position, axis, type, style, label, label_style
- `week_time_segment.graph.plane.annotations[]` (max len 1) → fields: width, height, type, dimension, style, label, sub_label, label_style, alignment, yposition, xposition
- `week_time_segment.graph.plane.start_yaxis.labels[]` (max len 5) → fields: label, position, style, sub_label, id
- `week_time_segment.graph.plane.bottom_xaxis.labels[]` (max len 7) → fields: label, position, style, sub_label, id
- `week_time_segment.graph.plots[]` (max len 1) → fields: type
- `week_time_segment.graph.plots[].plot.segments[]` (max len 1) → fields: style
- `week_time_segment.graph.plots[].plot.segments[].points[]` (max len 7) → fields: visible, position_x, position_y, style, accessibility_label, details
- `week_time_segment.graph.plots[].plot.bar_groups[]` (max len 7) → fields: position_x, width, accessibility_label, details, data_scrubber_details, bottom_label
- `week_time_segment.graph.plots[].plot.bar_groups[].bars[]` (max len 1) → fields: position_y, height, style
- `week_time_segment.breakdown_bar.bars[]` (max len 4) → fields: top_label_display, bottom_label_display, opacity_percentage
- `week_time_segment.breakdown_bar.configurable_bars[]` (max len 0) → fields: (scalar/nested)
- `week_time_segment.legend[]` (max len 1) → fields: graph_legend_style, icon, legend_text
- `month_time_segment.metrics[]` (max len 1) → fields: trend_key, metric_name_display, metric_value_display, metric_units_display, trend_direction, trend_style, trend_text_display, current_metric_value, previous_metric_value, metric_change
- `month_time_segment.graph.plane.lines[]` (max len 6) → fields: position, axis, type, style, label, label_style
- `month_time_segment.graph.plane.annotations[]` (max len 1) → fields: width, height, type, dimension, style, label, sub_label, label_style, alignment, yposition, xposition
- `month_time_segment.graph.plane.start_yaxis.labels[]` (max len 6) → fields: label, position, style, sub_label, id
- `month_time_segment.graph.plane.bottom_xaxis.labels[]` (max len 5) → fields: label, position, style, sub_label, id
- `month_time_segment.graph.plots[]` (max len 1) → fields: type
- `month_time_segment.graph.plots[].plot.segments[]` (max len 1) → fields: style
- `month_time_segment.graph.plots[].plot.segments[].points[]` (max len 30) → fields: visible, position_x, position_y, style, accessibility_label, details
- `month_time_segment.graph.plots[].plot.bar_groups[]` (max len 30) → fields: position_x, width, accessibility_label, details, data_scrubber_details, top_label, bottom_label
- `month_time_segment.graph.plots[].plot.bar_groups[].bars[]` (max len 1) → fields: position_y, height, style
- `month_time_segment.breakdown_bar.bars[]` (max len 4) → fields: top_label_display, bottom_label_display, opacity_percentage
- `month_time_segment.breakdown_bar.configurable_bars[]` (max len 0) → fields: (scalar/nested)
- `month_time_segment.legend[]` (max len 1) → fields: graph_legend_style, icon, legend_text
- `six_month_time_segment.metrics[]` (max len 1) → fields: trend_key, metric_name_display, metric_value_display, metric_units_display, trend_direction, trend_style, trend_text_display, current_metric_value, previous_metric_value, metric_change
- `six_month_time_segment.graph.plane.lines[]` (max len 6) → fields: position, axis, type, style, label, label_style
- `six_month_time_segment.graph.plane.start_yaxis.labels[]` (max len 6) → fields: label, position, style, sub_label, id
- `six_month_time_segment.graph.plane.bottom_xaxis.labels[]` (max len 6) → fields: label, position, style, sub_label, id
- `six_month_time_segment.graph.plots[]` (max len 2) → fields: type
- `six_month_time_segment.graph.plots[].plot.segments[]` (max len 2) → fields: style, top_label, bottom_label, position_x, position_y, width_percent
- `six_month_time_segment.graph.plots[].plot.segments[].points[]` (max len 57) → fields: visible, position_x, position_y, style, accessibility_label, details, graph_label
- `six_month_time_segment.breakdown_bar.bars[]` (max len 4) → fields: top_label_display, bottom_label_display, opacity_percentage
- `six_month_time_segment.breakdown_bar.configurable_bars[]` (max len 0) → fields: (scalar/nested)
- `six_month_time_segment.legend[]` (max len 0) → fields: (scalar/nested)
- `education_carousel.article_list[]` (max len 5) → fields: id, title, image_url, type, size, icon, paragraph, publish_date, sub_text, tag, article_url, border_style, cta
- `navigation_sections[]` (max len 5) → fields: section_name_display
- `navigation_sections[].navigation_items[]` (max len 10) → fields: graph_key, name_display
- `info_callouts[]` (max len 0) → fields: (scalar/nested)
- `trend_menu_list[]` (max len 0) → fields: (scalar/nested)
- `metric_education_list[]` (max len 2) → fields: title_display, content_display, image_display
- `trend_menus[]` (max len 0) → fields: (scalar/nested)

**Scalar fields (→ columns):**
- `metadata.ai_context_metadata.screen_identifier`: string
- `metadata.ai_context_metadata.is_wce_prefetch`: null
- `metadata.ai_context_metadata.is_wce_enabled`: boolean
- `metadata.ai_context_metadata.destination.screen`: string
- `metadata.ai_context_metadata.destination.parameters.fingerprint`: string
- `metadata.ai_context_metadata.destination.parameters.source`: string
- `metadata.ai_context_metadata.destination.parameters.screen_id`: string
- `metadata.ai_context_metadata.destination.parameters.source_type`: string
- `metadata.ai_context_metadata.destination.parameters.source_id`: string
- `metadata.ai_context_metadata.destination.parameters.agent_id`: string
- `metadata.ai_context_metadata.destination.parameters.preset_question_key`: null
- `metadata.ai_context_metadata.destination.parameters.static_initial_message`: null
- `metadata.ai_context_metadata.destination.parameters.education_type`: null
- `metadata.ai_context_metadata.destination.parameters.should_open_full_size`: boolean
- `metadata.ai_context_metadata.destination.parameters.args.context`: string
- `metadata.ai_context_metadata.destination.parameters.args.trend_type`: string
- `metadata.ai_context_metadata.ai_action.source`: string
- `metadata.ai_context_metadata.ai_action.screen_id`: string
- `metadata.ai_context_metadata.ai_action.source_type`: string
- `metadata.ai_context_metadata.ai_action.source_id`: string
- `metadata.ai_context_metadata.ai_action.args.context`: string
- `metadata.ai_context_metadata.ai_action.args.trend_type`: string
- `metadata.ai_context_metadata.ai_action.should_open_full_size`: boolean
- `metadata.ai_context_metadata.ai_action.education_type`: null
- `metadata.ai_context_metadata.ai_action.fingerprint`: string
- `metadata.ai_context_metadata.ai_action.agent_id`: string
- `metadata.ai_context_metadata.ai_action.static_initial_message`: null
- `metadata.ai_context_metadata.ai_action.entry_text`: null
- `metadata.ai_context_metadata.ai_action.include_initial_message`: null
- `metadata.ai_context_metadata.ai_action.conversation_seed_id`: null
- `metadata.ai_context_metadata.ai_action.preset_question`: null
- `metadata.ai_context_metadata.ai_action.onboarding_analytic_source`: null
- `metadata.ai_context_metadata.ai_action.entrypoint_experience`: string
- `header_name_display`: string
- `segment_controller.initial_index`: number
- `integrations_upsell`: null
- `week_time_segment.date_picker.current_date_range_display`: string
- `week_time_segment.date_picker.next_date_time`: null
- `week_time_segment.date_picker.previous_date_time`: string
- `week_time_segment.graph.id`: null
- `week_time_segment.graph.plane.accessibility_info.label`: string
- `week_time_segment.graph.plane.start_yaxis.type`: string
- `week_time_segment.graph.plane.start_yaxis.style`: null
- `week_time_segment.graph.plane.start_yaxis.offset`: number
- `week_time_segment.graph.plane.start_yaxis.axis_description`: null
- `week_time_segment.graph.plane.start_yaxis.scrim_present`: boolean
- `week_time_segment.graph.plane.end_yaxis`: null
- `week_time_segment.graph.plane.bottom_xaxis.type`: string
- `week_time_segment.graph.plane.bottom_xaxis.style`: null
- `week_time_segment.graph.plane.bottom_xaxis.offset`: number
- `week_time_segment.graph.plane.bottom_xaxis.axis_description`: null
- `week_time_segment.graph.plane.bottom_xaxis.scrim_present`: boolean
- `week_time_segment.graph.plane.enable_advanced_haptics`: null
- `week_time_segment.graph.plane.top_xaxis`: null
- `week_time_segment.graph.graph_title_display`: null
- `week_time_segment.graph.graph_buttons`: null
- `week_time_segment.vow`: string
- `week_time_segment.breakdown_bar.title_display`: string
- `week_time_segment.breakdown_bar.sub_title_display`: string
- `week_time_segment.breakdown_bar.number_of_grid_columns`: null
- … +83 more

## `workout_detail`  (4 samples)

**Arrays → child tables:**
- `horizontal_stats[]` (max len 2) → fields: stat_main_value_display, stat_title_display, stat_title_suffix_display, stat_comparison_display, stat_trend_type, stat_icon_display
- `key_metric_carousel.key_metric_tile[]` (max len 4) → fields: key_metric_tile_icon, key_metric_tile_title_display, key_metric_tile_stat_value_display, key_metric_tile_suffix_display, key_metric_tile_trend_display, key_metric_tile_trend_type
- `graph_response.plane.lines[]` (max len 8) → fields: position, axis, type, style, label, label_style
- `graph_response.plane.start_yaxis.labels[]` (max len 5) → fields: label, position, style, sub_label, id
- `graph_response.plane.end_yaxis.labels[]` (max len 0) → fields: (scalar/nested)
- `graph_response.plots[]` (max len 7) → fields: type
- `graph_response.plots[].plot.segments[]` (max len 73) → fields: style
- `graph_response.plots[].plot.segments[].points[]` (max len 1265) → fields: visible, position_x, position_y, style, accessibility_label, details, graph_label
- `bar_graph_container.heart_rate_zones[]` (max len 6) → fields: bar_graph_tile_title_display, bar_graph_tile_percentage_display, bar_graph_tile_time_display, bar_graph_tile_time_suffix_display, id, tile_style, bar_graph_tile_subtitle_display, show_radio_toggle, hide_background
- `bar_graph_container.heart_rate_zones[].bar_graph.time_bound_ranges[]` (max len 73) → fields: lower_endpoint, lower_bound_type, upper_endpoint, upper_bound_type
- `tags[]` (max len 1) → fields: label_display
- `tags_v2[]` (max len 1) → fields: title, left_icon, right_icon, tag_style, destination, image_url, action
- `details_edit_components.allowed_strap_locations[]` (max len 13) → fields: strap_location_title_display, strap_location
- `onboarding_overlays[]` (max len 1) → fields: (scalar/nested)
- `weightlifting_cardio_details.weightlifting_exercises.exercise_summary_carousel.items[]` (max len 8) → fields: exercise_id, trackable, title_display, subtitle_display, tonnage_display, image_url, volume_display, volume_title_display, end_icon
- `weightlifting_cardio_details.weightlifting_exercises.exercise_summary_carousel.items[].heart_rate_timeline[]` (max len 0) → fields: (scalar/nested)
- `weightlifting_cardio_details.weightlifting_exercises.exercise_summary_carousel.items[].achievement_icons[]` (max len 3) → fields: (scalar/nested)
- `weightlifting_cardio_details.weightlifting_exercises.exercise_summary.cards[]` (max len 0) → fields: (scalar/nested)
- `weightlifting_cardio_details.weightlifting_exercises.exercise_summary.exercise_card_groups[]` (max len 5) → fields: (scalar/nested)
- `weightlifting_cardio_details.weightlifting_exercises.exercise_summary.exercise_card_groups[].cards[]` (max len 3) → fields: exercise_id, trackable, title_display, image_url, totals_label, volume_title_display, end_icon
- `weightlifting_cardio_details.weightlifting_exercises.exercise_summary.exercise_card_groups[].cards[].stat_rows[]` (max len 6) → fields: volume_display, weight_display, avg_hr_display, achievement_icon
- `weightlifting_cardio_details.segmented_control_display[]` (max len 2) → fields: name_display, id
- `menu_options[]` (max len 3) → fields: display_label, action, destination

**Scalar fields (→ columns):**
- `metadata.ai_context_metadata.is_wce_prefetch`: boolean
- `metadata.ai_context_metadata.is_wce_enabled`: boolean
- `metadata.ai_context_metadata.destination.screen`: string
- `metadata.ai_context_metadata.destination.parameters.fingerprint`: string
- `metadata.ai_context_metadata.destination.parameters.source`: string
- `metadata.ai_context_metadata.destination.parameters.screen_id`: string
- `metadata.ai_context_metadata.destination.parameters.source_type`: string
- `metadata.ai_context_metadata.destination.parameters.source_id`: string
- `metadata.ai_context_metadata.destination.parameters.agent_id`: string
- `metadata.ai_context_metadata.destination.parameters.preset_question_key`: null
- `metadata.ai_context_metadata.destination.parameters.static_initial_message`: null
- `metadata.ai_context_metadata.destination.parameters.education_type`: null
- `metadata.ai_context_metadata.destination.parameters.should_open_full_size`: boolean
- `metadata.ai_context_metadata.destination.parameters.args.context`: string
- `metadata.ai_context_metadata.destination.parameters.args.activity_id`: string
- `metadata.ai_context_metadata.ai_action.source`: string
- `metadata.ai_context_metadata.ai_action.screen_id`: string
- `metadata.ai_context_metadata.ai_action.source_type`: string
- `metadata.ai_context_metadata.ai_action.source_id`: string
- `metadata.ai_context_metadata.ai_action.args.context`: string
- `metadata.ai_context_metadata.ai_action.args.activity_id`: string
- `metadata.ai_context_metadata.ai_action.should_open_full_size`: boolean
- `metadata.ai_context_metadata.ai_action.education_type`: null
- `metadata.ai_context_metadata.ai_action.fingerprint`: string
- `metadata.ai_context_metadata.ai_action.agent_id`: string
- `metadata.ai_context_metadata.ai_action.static_initial_message`: null
- `metadata.ai_context_metadata.ai_action.entry_text`: null
- `metadata.ai_context_metadata.ai_action.include_initial_message`: null
- `metadata.ai_context_metadata.ai_action.conversation_seed_id`: null
- `metadata.ai_context_metadata.ai_action.preset_question`: null
- `metadata.ai_context_metadata.ai_action.onboarding_analytic_source`: null
- `metadata.ai_context_metadata.ai_action.entrypoint_experience`: string
- `metadata.ai_context_metadata.screen_identifier`: string
- `link_workout_option_enabled`: boolean
- `link_workout_cta_tile.icon`: string
- `link_workout_cta_tile.title`: string
- `link_workout_cta_tile.subtitle`: string
- `link_workout_cta_tile.background_image_url`: null
- `link_workout_cta_tile.left_image_url`: null
- `link_workout_cta_tile.tile_cta`: string
- `link_workout_cta_tile.border_style`: string
- `link_workout_cta_tile.button_text`: string
- `link_workout_cta_tile.button_icon`: string
- `link_workout_cta_tile.dismissible`: boolean
- `link_workout_cta_tile.enabled`: boolean
- `link_workout_cta_tile.show_caret_icon`: boolean
- `link_workout_cta_tile.modal_tile_content`: null
- `link_workout_cta_tile.cta_supplemental_info`: null
- `link_workout_cta_tile.destination`: null
- `link_workout_cta_tile.completed`: boolean
- `link_workout_cta_tile`: null
- `title_bar.s3_icon_url`: string
- `title_bar.title_display`: string
- `title_bar.subtitle_display`: string
- `horizontal_stat.stat_main_value_display`: string
- `horizontal_stat.stat_title_display`: string
- `horizontal_stat.stat_title_suffix_display`: null
- `horizontal_stat.stat_comparison_display`: string
- `horizontal_stat.stat_trend_type`: string
- `horizontal_stat.stat_icon_display`: null
- … +75 more

## `workouts`  (1 sample)

**Arrays → child tables:**
- `records[]` (max len 25) → fields: id, v1_id, user_id, created_at, updated_at, start, end, timezone_offset, sport_name, score_state, sport_id

**Scalar fields (→ columns):**
- `next_token`: string
