# the tests skipped on OCIS are listed in issue https://github.com/owncloud/web/issues/7264 for further implementation in playwright
Feature: Autocompletion of share-with names
  As a user
  I want to share files, with minimal typing, to the right people or groups
  So that I can efficiently share my files with other users or groups

  Background:
    Given the administrator has set the default folder for received shares to "Shares" in the server
    And these users have been created with default attributes and without skeleton files in the server but not initialized:
      | username    |
      | regularuser |
    And these users have been created without initialization and without skeleton files in the server:
      | username | password  | displayname  | email        |
      | two      | %regular% | Brian Murphy | u2@oc.com.np |
      | u444     | %regular% | Four         | u3@oc.com.np |
    And these groups have been created in the server:
      | groupname |
      | finance1  |
      | finance2  |
    And the setting "outgoing_server2server_share_enabled" of app "files_sharing" has been set to "no" in the server

  @issue-ocis-1317 @issue-ocis-1675
  Scenario Outline: autocompletion of user having special characters in their displaynames
    Given these users have been created without initialization and without skeleton files in the server:
      | username  | password  | displayname   | email             |
      | normalusr | %regular% | <displayName> | msrmail@oc.com.np |
    And user "regularuser" has created file "data.zip" in the server
    And user "regularuser" has logged in using the webUI
    And the user has browsed to the personal page
    And the user has opened the share dialog for file "data.zip"
    When the user types "<search>" in the share-with-field
    Then only users and groups that contain the string "<search>" in their name or displayname should be listed in the autocomplete list on the webUI
    Examples:
      | displayName | search |
      | -_.ocusr    | -_     |
      | _ocusr@     | _u     |

  @issue-ocis-1317 @issue-ocis-1675
  Scenario Outline: autocompletion of groups having special characters in their names
    Given these groups have been created in the server:
      | groupname |
      | <group>   |
    And user "regularuser" has created file "data.zip" in the server
    And user "regularuser" has logged in using the webUI
    And the user has browsed to the personal page
    And the user has opened the share dialog for file "data.zip"
    When the user types "<search>" in the share-with-field
    Then only users and groups that contain the string "<search>" in their name or displayname should be listed in the autocomplete list on the webUI
    Examples:
      | group    | search |
      | @-_.     | @-     |
      | _ocgrp@  | _u     |
      | -_.ocgrp | -_     |
