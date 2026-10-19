Feature: F1 Submit expenses

  @story-F1.1
  Rule: A claim is made of one or more line items

    Scenario: Maya builds a claim from two line items
      Given Maya has started a new claim
      When she adds a "Travel" item of "$18.00" described "Bus to the client site" dated "2026-01-10"
      And she adds a "Meals" item of "$12.50" described "Team lunch" dated "2026-01-10"
      Then her claim shows two line items with a total of "$30.50"

    @negative
    Scenario: A claim with no line items is not submitted
      Given Maya has started a new claim with no line items
      When she submits the claim
      Then the claim is not pending

  @story-F1.2
  Rule: An employee may attach a receipt to a line item

    Scenario: Maya attaches a receipt to a taxi item
      Given Maya has started a new claim with a "Travel" item of "$42.00" described "Taxi to the airport"
      When she attaches the receipt "taxi-0110.pdf" to that item
      Then that item shows the receipt "taxi-0110.pdf"

  @story-F1.3
  Rule: A line item above $25.00 requires a receipt

    @negative
    Scenario: A $25.01 item without a receipt blocks the submission
      Given Maya has a draft claim with one "Meals" item of "$25.01" and no receipt
      When she submits the claim
      Then the claim is not pending

    Scenario: A $25.00 item needs no receipt
      Given Maya has a draft claim with one "Meals" item of "$25.00" and no receipt
      When she submits the claim
      Then the claim is pending

  @story-F1.4
  Rule: An employee saves a claim as a draft and submits it when ready

    Scenario: Maya saves a draft and submits it later
      Given Maya has a draft claim with one "Supplies" item of "$15.00"
      When she leaves the draft and comes back to submit it
      Then the claim is pending

    @negative
    Scenario: An employee with no line manager cannot submit
      Given Tom has no line manager assigned
      And Tom has a draft claim with one "Supplies" item of "$15.00"
      When Tom submits the claim
      Then the claim is not pending

  @story-F1.5
  Rule: An employee sees only their own claims, each with its status

    Scenario: Maya sees the status of each of her claims
      Given Maya has one pending claim and one rejected claim
      When she opens her claims
      Then she sees both claims, one pending and one rejected

    @negative
    Scenario: Maya does not see a colleague's claim
      Given Ana has submitted a claim
      When Maya opens her claims
      Then Ana's claim is not among them

  @story-F1.6
  Rule: An employee may edit or withdraw a claim only while it is pending

    Scenario: Maya corrects the amount on a pending claim
      Given Maya has a pending claim with one "Meals" item of "$18.20"
      When she changes that item's amount to "$20.00"
      Then the claim total is "$20.00" and the claim is still pending

    Scenario: Maya withdraws a pending claim
      Given Maya has a pending claim
      When she withdraws it
      Then the claim shows as withdrawn

    @negative
    Scenario: An approved claim cannot be withdrawn
      Given Maya has an approved claim
      When she tries to withdraw it
      Then the claim is still approved

  @story-F1.7
  Rule: An employee sees why a claim was rejected and may resubmit it after correcting it

    Scenario: Maya reads the reason and resubmits
      Given Ravi rejected Maya's claim with the reason "The hotel receipt is missing"
      When Maya opens the claim
      Then she sees the reason "The hotel receipt is missing"
      When she attaches the receipt "hotel.pdf" and resubmits it
      Then the claim is pending
