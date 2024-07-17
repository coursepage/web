<template>
  <div :class="$_ocSpinner_class" :aria-label="ariaLabel" tabindex="-1" role="img">
    <span v-for="dot in 3" :key="dot" :class="`dot dot-${dot}`"></span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { getSizeClass } from '../../utils/sizeClasses'

/**
 * Remote actions can take an undefined portion of time. The spinner gives feedback to the users about an actions being processed.
 *
 * ## Accessibility
 * ### Making spinners accessible for screen readers
 *
 * 1. Making them (only!) programmatically focusable with `tabindex="-1"`. **This is already included in the component.**
 * 2. Giving them the [ARIA role](https://developers.google.com/web/fundamentals/accessibility/semantics-aria) of "img" (image) to change the semantics of the spinner element from something meaningless (div) to something meaningful (image). **This is already included in the component.**
 * 3. Giving them an accessible name ([explainer for the term](https://developer.paciellogroup.com/blog/2017/04/what-is-an-accessible-name/)) via aria-label/the ariaLabel prop. An element that has an accessible name, but no role is ignored by assistive technology
 * 4. During an action of the application that shows the spinner to visual users, the spinner should programmatically receive focus (see 1.), so that the accessible name of it (default: Loading, see 2.) is read out by screen reader software. After completion of the loading process the focus should be sent to a reasonable place of the newly loaded content.
 *
 *
 */
export default defineComponent({
  name: 'OcSpinner',
  props: {
    ariaLabel: {
      type: String,
      required: false,
      default: 'Loading'
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value: string) => {
        return ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge', 'xxxlarge'].includes(
          value
        )
      }
    }
  },
  computed: {
    $_ocSpinner_class() {
      return ['oc-spinner', `oc-spinner-${getSizeClass(this.size)}`]
    }
  }
})
</script>

<style lang="scss">
@mixin oc-spinner-size($factor) {
  height: round(calc($oc-size-icon-default * $factor));
  width: round(calc($oc-size-icon-default * $factor));
  .dot {
    width: round(
      calc($oc-size-icon-default * $factor / 5)
    ); // Each dot size proportional to spinner size
    height: round(calc($oc-size-icon-default * $factor / 5));
  }
}

.oc-spinner {
  display: inline-flex;
  align-items: center;
  gap: 0.2em; // spacing between dots

  .dot {
    background-color: currentColor;
    border-radius: 50%;
    animation: pulsate 1.4s infinite cubic-bezier(0.4, 0, 0.2, 1);
    &.dot-1 {
      animation-delay: -0.32s;
    }
    &.dot-2 {
      animation-delay: -0.16s;
    }
  }

  &-xs {
    @include oc-spinner-size(0.5);
  }

  &-s {
    @include oc-spinner-size(0.7);
  }

  &-m {
    @include oc-spinner-size(1);
  }

  &-l {
    @include oc-spinner-size(1.5);
  }

  &-xl {
    @include oc-spinner-size(2);
  }

  &-xxl {
    @include oc-spinner-size(4);
  }

  &-xxxl {
    @include oc-spinner-size(8);
  }
}

@keyframes pulsate {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>

<docs>
```js
<div class="oc-flex oc-flex-middle">
  <oc-spinner aria-label="Loading with extra small spinner" size="xsmall" class="oc-mr-s" />
  <oc-spinner aria-label="Loading with small spinner" size="small" class="oc-mr-s" />
  <oc-spinner aria-label="Loading with default sized spinner" class="oc-mr-s" />
  <oc-spinner aria-label="Loading with medium spinner" size="medium" class="oc-mr-s" />
  <oc-spinner aria-label="Loading with large spinner" size="large" class="oc-mr-s" />
  <oc-spinner aria-label="Loading with extra large spinner" size="xlarge" class="oc-mr-s" />
  <oc-spinner aria-label="Loading with extra extra large spinner" size="xxlarge" class="oc-mr-s" />
  <oc-spinner aria-label="Loading with extra extra extra large spinner" size="xxxlarge" />
</div>
```
</docs>
