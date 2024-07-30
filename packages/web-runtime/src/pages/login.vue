<template>
  <div class="oc-width-1-1 oc-height-1-1">
    <div class="spinner-container">
      <oc-spinner size="xlarge" :aria-label="$gettext('Loading')" />
    </div>
  </div>
</template>

<script lang="ts">
import { authService } from '../services/auth'
import { queryItemAsString, useRouteQuery } from '@ownclouders/web-pkg'
import { defineComponent, unref } from 'vue'

export default defineComponent({
  name: 'LoginPage',

  setup() {
    const redirectUrl = useRouteQuery('redirectUrl')
    authService.loginUser(queryItemAsString(unref(redirectUrl)))

    return {}
  }
})
</script>
<style lang="scss">
.spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  .oc-spinner {
    color: #0a264e;
    display: inline-block;
    &::after {
      border: 10px solid;
      border-bottom: 10px solid transparent;
    }
  }
}
</style>
