#!/usr/bin/env bash

# when deleting the tests suites from /features there might be the tests scenarios that might be in the expected to failure file
# this script checks if there are such scenarios in the expected to failure file which needs to be deleted

# helper functions
log_error() {
	echo -e "\e[31m$1\e[0m"
}

log_info() {
	echo -e "\e[37m$1\e[0m"
}

log_success() {
	echo -e "\e[32m$1\e[0m"
}

SCRIPT_PATH=$(dirname "$0")
PATH_TO_SUITES="${SCRIPT_PATH}/features"
PATH_TO_EXPECTED_FAILURE_FILE="${SCRIPT_PATH}/expected-failures-with-ocis-server-ocis-storage.md"
# contains all the suites names inside tests/acceptance/features
AVAILABLE_SUITES=($(ls -l "$PATH_TO_SUITES" | grep '^d' | awk '{print $NF}'))

# regex to match [someSuites/someFeatureFile.feature:lineNumber]
SCENARIO_REGEX="\[([a-zA-Z0-9]+/[a-zA-Z0-9]+\.feature:[0-9]+)]"

# contains all those suites available in the expected to failure files in pattern [someSuites/someFeatureFile.feature:lineNumber]
EXPECTED_FAILURE_SCENARIOS=($(grep -Eo ${SCENARIO_REGEX} ${PATH_TO_EXPECTED_FAILURE_FILE}))

# get and store only the suites names from EXPECTED_FAILURE_SCENARIOS
EXPECTED_FAILURE_SUITES=()
for scenario in "${EXPECTED_FAILURE_SCENARIOS[@]}"; do
  if [[ $scenario =~ \[([a-zA-Z0-9]+) ]]; then
     suite="${BASH_REMATCH[1]}"
     EXPECTED_FAILURE_SUITES+=("$suite")
  fi
done

# also filter the duplicated suites name
EXPECTED_FAILURE_SUITES=($(echo "${EXPECTED_FAILURE_SUITES[@]}" | tr ' ' '\n' | sort | uniq))

# Check the existence of the suite
NONEXISTING_SCENARIOS=()
for suite in "${EXPECTED_FAILURE_SUITES[@]}"; do
  if [[ " ${AVAILABLE_SUITES[*]} " != *" $suite "* ]]; then
    pattern="(${suite}/[a-zA-Z0-9]+\\.feature:[0-9]+)"
    NONEXISTING_SCENARIOS+=($(grep -Eo ${pattern} ${PATH_TO_EXPECTED_FAILURE_FILE}))
  fi
done

count="${#NONEXISTING_SCENARIOS[@]}"

if [ "$count" -gt 0 ]; then
  log_info "The following test scenarios do not exist anymore:"
  log_info "They can be deleted from the '${PATH_TO_EXPECTED_FAILURE_FILE}'."
  for scenario_path in "${NONEXISTING_SCENARIOS[@]}"; do
    log_error "$scenario_path"
  done
  exit 1
fi

log_success "All the suites in the expected failure file exist in the test suites"
