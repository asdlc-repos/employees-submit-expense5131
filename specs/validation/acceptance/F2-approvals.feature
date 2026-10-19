Feature: F2 Approvals

  @story-F2.1
  Rule: A manager sees their team's pending claims, oldest first

    Scenario: Ravi's queue lists the older claim first
      Given Maya and Ana report to Ravi
      And Maya submitted a claim on "2026-01-12" and Ana submitted one on "2026-01-13"
      When Ravi opens his approvals
      Then Maya's claim is listed before Ana's claim

    @negative
    Scenario: A claim from outside the team is not listed
      Given Tom reports to someone other than Ravi
      And Tom has a pending claim
      When Ravi opens his approvals
      Then Tom's claim is not listed

  @story-F2.2
  Rule: A manager sees a claim's line items and receipts before deciding

    Scenario: Ravi opens Maya's claim
      Given Maya's pending claim has a "Travel" item of "$42.00" with the receipt "taxi-0110.pdf"
      When Ravi opens that claim
      Then he sees the item, its amount and the receipt "taxi-0110.pdf"

  @story-F2.3
  Rule: Only a claim's own line manager approves it, and never their own claim

    Scenario: Ravi approves Maya's claim
      Given Maya has a pending claim that reports to Ravi
      When Ravi approves it
      Then the claim is approved and no longer in his queue

    @negative
    Scenario: Ravi does not decide his own claim
      Given Ravi has a pending claim of his own
      When Ravi opens his approvals
      Then his own claim is not listed for him to decide

  @story-F2.4
  Rule: A manager rejects a claim only with a reason

    Scenario: Ravi rejects with a reason
      Given Maya has a pending claim that reports to Ravi
      When Ravi rejects it with the reason "Please attach the hotel receipt"
      Then the claim is rejected with that reason

    @negative
    Scenario: A rejection without a reason is refused
      Given Maya has a pending claim that reports to Ravi
      When Ravi tries to reject it with no reason
      Then the claim is still pending

  @story-F2.5
  Rule: The line manager is emailed when a claim from their team is submitted

    Scenario: Ravi is emailed about Ana's new claim
      Given Ana reports to Ravi
      When Ana submits a claim
      Then Ravi receives an email naming Ana's claim

  @story-F2.6
  Rule: The employee is emailed when their claim is decided

    Scenario: Maya is emailed about the approval
      Given Maya has a pending claim that reports to Ravi
      When Ravi approves it
      Then Maya receives an email saying the claim was approved

  @story-F2.7
  Rule: Only Finance assigns line managers, and nobody is their own manager

    Scenario: Nadia assigns Ravi as Tom's line manager
      Given Tom has signed in and has no line manager
      When Nadia assigns Ravi as Tom's line manager
      Then Tom's line manager is Ravi

    @negative
    Scenario: A person cannot be assigned as their own line manager
      Given Tom has signed in
      When Nadia assigns Tom as Tom's line manager
      Then Tom has no line manager

    Scenario: Reassigning does not move a claim already pending
      Given Tom's line manager is Ravi and Tom has a pending claim
      When Nadia assigns Priya as Tom's line manager
      Then Tom's pending claim is still waiting for Ravi

    @negative
    Scenario: A manager cannot open the People screen
      When Ravi looks for the People screen
      Then it is not available to him
