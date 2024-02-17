Feature: Upload
  As a user
  I want to upload resources
  So that I can store them in owncloud

  Background:
    Given "Admin" logs in
    And "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" logs in
    And "Admin" opens the "admin-settings" app
    And "Admin" navigates to the users management page
    When "Admin" changes the quota of the user "Alice" to "0.00001" using the sidebar panel
    And "Alice" opens the "files" app


  Scenario: Upload resources in personal space
    Given "Alice" creates the following resources
      | resource          | type    | content             |
      | new-lorem-big.txt | txtFile | new lorem big file  |
      | lorem.txt         | txtFile | lorem file          |
      | textfile.txt      | txtFile | some random content |
      # Coverage for bug: https://github.com/owncloud/ocis/issues/8361
      | comma,.txt        | txtFile | comma               |
    When "Alice" uploads the following resources
      | resource          | option    |
      | new-lorem-big.txt | replace   |
      | lorem.txt         | skip      |
      | textfile.txt      | keep both |
    And "Alice" creates the following resources
      | resource           | type    | content      |
      | PARENT/parent.txt  | txtFile | some text    |
      | PARENT/example.txt | txtFile | example text |
    And "Alice" uploads the following resources via drag-n-drop
        | resource       |
        | simple.pdf     |
        | testavatar.jpg |
    And "Alice" tries to upload the following resource
      | resource      | error            |
      | lorem-big.txt | Not enough quota |
    And "Alice" downloads the following resources using the sidebar panel
      | resource   | type   |
      | PARENT     | folder |
      # Coverage for bug: https://github.com/owncloud/ocis/issues/8361
      | comma,.txt | file   |
  #  currently upload folder feature is not available in playwright
  #  And "Alice" uploads the following resources
  #    | resource |
  #    | PARENT   |
    And "Alice" logs out


  Scenario: upload multiple small files
    When "Alice" uploads 50 small files in personal space
    Then "Alice" should see the text "50 items with 600 B in total (50 files, 0 folders)" at the footer of the page
    And "Alice" should see 50 resources in the personal space files view
    And "Alice" logs out
