Feature: F3 Payroll export

  @story-F3.1
  Rule: Finance sees the approved claims not yet exported, and only those

    Scenario: Nadia sees an approved claim waiting
      Given Maya's claim of "$62.00" has been approved and not exported
      When Nadia opens the payroll export
      Then Maya's claim of "$62.00" is waiting for export

    @negative
    Scenario: A pending claim is not waiting for export
      Given Ana has a pending claim of "$22.50"
      When Nadia opens the payroll export
      Then Ana's claim is not waiting for export

  @story-F3.2
  Rule: Only Finance exports, and an export holds every approved claim not yet exported

    Scenario: Nadia exports two approved claims
      Given two approved claims are waiting: Maya's of "$62.00" and Ana's of "$55.60"
      When Nadia exports them
      Then she downloads a CSV with one row per claim giving employee, claim ID, total and approval date
      And no claim is waiting for export

    @negative
    Scenario: An exported claim is not exported again
      Given Nadia has exported Maya's approved claim
      And Ana's claim has since been approved
      When Nadia exports again
      Then the new file holds only Ana's claim

    @negative
    Scenario: Nothing waiting means no export
      Given no approved claim is waiting
      When Nadia tries to export
      Then no export is created

    @negative
    Scenario: An employee cannot reach the payroll export
      When Maya looks for the payroll export
      Then it is not available to her

  @story-F3.3
  Rule: Finance sees which claims each export included and when it ran

    Scenario: Nadia opens a past export
      Given Nadia exported Maya's claim of "$62.00" on "2026-01-05"
      When she opens that export
      Then she sees the date "2026-01-05" and Maya's claim of "$62.00"

  @story-F3.4
  Rule: Finance may download a past export again

    Scenario: Nadia downloads the same file twice
      Given Nadia exported two claims
      When she downloads that export again
      Then the file holds the same two rows as the first download
