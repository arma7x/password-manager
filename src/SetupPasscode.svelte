<script lang="ts">

  import { onMount, onDestroy } from 'svelte';
  import { createKaiNavigator } from './utils/navigation.ts';
  import { SoftwareKey, Dialog } from './components/index.ts';
  import Passcode from './Passcode.svelte';
  import {
    checkPasscodeRequirement,
    hashPassword,
    comparePassword,
    generateRSAKey,
    convertRSAKeyToJWK,
    aesEncrypt,
    dbAppConfig,
    setPasswordHash,
    setPublicKey,
    setEncryptedPrivateKey
  } from './utils/WebCryptoVault.ts';

  export let title: string = 'Modal';
  export let onSuccess: Function = (passcode: string) => {};
  export let onError: Function = (error: any) => {};
  export let onOpened: Function = () => {};
  export let onClosed: Function = () => {};

  let refPasscode: Passcode;
  let passcode: string = '';

  let softwareKey: SoftwareKey;
  let dialog: Dialog;

  let navOptions = {
    verticalNavClass: 'navClassModal',
    softkeyLeftListener: function(evt) {
      refPasscode.toggleVisibility();
    },
    softkeyRightListener: function(evt) {
      window.close();
    },
    enterListener: function(evt) {
      showConfirmDialog();
    },
    backspaceListener: function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  function showConfirmDialog() {
    dialog = new Dialog({
      target: document.body,
      props: {
        title: 'Confirmation',
        body: "Are sure to continue ?",
        softKeyCenterText: '',
        softKeyLeftText: 'No',
        softKeyRightText: 'Yes',
        onSoftkeyLeft: (evt) => {
          dialog.$destroy();
        },
        onSoftkeyRight: (evt) => {
          dialog.$destroy();
          setup();
        },
        onEnter: (evt) => {},
        onBackspace: (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          dialog.$destroy();
        },
        onOpened: () => {
          navInstance.detachListener();
          refPasscode.blur();
        },
        onClosed: () => {
          navInstance.attachListener();
          dialog = null;
          refPasscode.focus();
        }
      }
    });
  }

  async function setup() {
    try {
      checkPasscodeRequirement(passcode, 10);
      const hash = hashPassword(passcode);
      if (comparePassword(passcode, hash)) {
        const key = await generateRSAKey();
        let publicKey = await convertRSAKeyToJWK(key.publicKey);
        let privateKey = await convertRSAKeyToJWK(key.privateKey);
        const encryptPrivateKey = await aesEncrypt(JSON.stringify(privateKey), passcode);
        await setPasswordHash(hash);
        await setPublicKey(publicKey);
        await setEncryptedPrivateKey(encryptPrivateKey);
        onSuccess(passcode);
      } else {
        throw("Fail hashing passcode");
      }
    } catch (err) {
      await dbAppConfig.clear();
      onError(err);
    }
  }

  onMount(() => {
    navInstance.attachListener();
    softwareKey = new SoftwareKey({
      target: document.body,
      props: {
        isInvert: false,
        leftText: 'Toggle',
        centerText: 'Enter',
        rightText: 'Exit'
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
