<script lang="ts">

  import { onMount, onDestroy } from 'svelte';
  import { createKaiNavigator } from '../utils/navigation.ts';
  import { SoftwareKey } from '../components/index.ts';
  import Passcode from './Passcode.svelte';
  import { checkPasscodeRequirement, comparePassword } from '../utils/WebCryptoVault.ts';

  export let title: string = 'Modal';
  export let hashedPasscode: string;
  export let canMinimize: boolean = false;
  export let onSuccess: Function = (passcode: string) => {};
  export let onError: Function = (error: any) => {};
  export let onOpened: Function = () => {};
  export let onClosed: Function = () => {};

  let refPasscode: Passcode;
  let passcode: string = '';

  let softwareKey: SoftwareKey;

  let navOptions = {
    verticalNavClass: 'navClassModal',
    softkeyLeftListener: function(evt) {
      if (refPasscode.toggleVisibility())
        softwareKey.setLeftText("Hide");
      else
        softwareKey.setLeftText("Show");
    },
    softkeyRightListener: function(evt) {
      if (!canMinimize)
        window.close();
      else
        onSuccess(null);
    },
    enterListener: function(evt) {
      try {
        checkPasscodeRequirement(passcode, 10);
        if (comparePassword(passcode, hashedPasscode) == false) {
          throw("Invalid passcode");
        }
        onSuccess(passcode);
      } catch (err) {
        onError(err);
      }
    },
    backspaceListener: function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  onMount(() => {
    navInstance.attachListener();
    softwareKey = new SoftwareKey({
      target: document.body,
      props: {
        isInvert: false,
        leftText: 'Show',
        centerText: 'Enter',
        rightText: canMinimize ? 'Cancel' : 'Exit'
      }
    });
    onOpened();
  })

  onDestroy(() => {
    navInstance.detachListener();
    softwareKey.$destroy();
    onClosed();
  })

</script>

<svelte:options accessors/>

<div class="kai-dialog">
  <div class="kai-dialog-content">
    <div class="kai-dialog-header">{title}</div>
    <div class="kai-dialog-body">
      <div id="container">
        <Passcode bind:this={refPasscode} className={"navClassModal"} bind:passcode="{passcode}" />
      </div>
    </div>
  </div>
</div>

<style>
  .kai-dialog {
    width: 100%;
    height: calc(100% - 12px);
    bottom: 30px;
    position: fixed;
    background-color: rgba(0, 0, 0, 0.6);
  }
  .kai-dialog > .kai-dialog-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100% - 66px);
    bottom: 30px;
    position: fixed;
    background-color: var(--themeColor);
  }
  .kai-dialog > .kai-dialog-content > .kai-dialog-header {
    width: 100%;
    text-align: center;
    vertical-align: middle;
    line-height: 28px;
    height: 28px;
    padding: 0 4px;
    color: #313131;
    background-color: #cccccc;
    font-weight: 200;
  }
  .kai-dialog > .kai-dialog-content > .kai-dialog-body {
    max-height: calc(100% - 78px);
    height: 220px;
    overflow: scroll;
    padding: 5px;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
  }
</style>