<script lang="ts">

  import { onMount, onDestroy } from 'svelte';
  import { createKaiNavigator } from '../utils/navigation.ts';
  import { SoftwareKey, Dialog, LoadingBar, Separator } from '../components/index.ts';
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
    setEncryptedPrivateKey,
    getEncryptedPrivateKey,
    convertJWKToRSAKey,
    aesDecrypt,
    getAllPasswordVault,
    rsaDecrypt,
    getPasswordHash,
    getPublicKey,
    pushIntoPasswordVault,
    rsaEncrypt
  } from '../utils/WebCryptoVault.ts';

  export let title: string = 'Modal';
  export let onSuccess: Function = (passcode: string) => {};
  export let onError: Function = (error: any) => {};
  export let onOpened: Function = () => {};
  export let onClosed: Function = () => {};

  let refCurrentPasscode: Passcode;
  let currentPasscode: string = '';
  let refNewPasscode: Passcode;
  let newPasscode: string = '';

  let softwareKey: SoftwareKey;
  let dialog: Dialog;
  let loadingBar: LoadingBar;

  let navOptions = {
    verticalNavClass: 'navClassModal',
    softkeyLeftListener: function(evt) {
      refNewPasscode.toggleVisibility();
      if (refCurrentPasscode.toggleVisibility()) {
        softwareKey.setLeftText("Hide");
      } else {
        softwareKey.setLeftText("Show");
      }
    },
    softkeyRightListener: function(evt) {
      onSuccess(null);
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
          if (navInstance.verticalNavIndex == 0)
            refCurrentPasscode.blur();
          else if  (navInstance.verticalNavIndex == 1)
            refNewPasscode.blur();
        },
        onClosed: () => {
          navInstance.attachListener();
          dialog = null;
          if (navInstance.verticalNavIndex == 0)
            refCurrentPasscode.focus();
          else if  (navInstance.verticalNavIndex == 1)
            refNewPasscode.focus();
        }
      }
    });
  }

  function showLoadingBar() {
    loadingBar = new LoadingBar({
      target: document.body,
      props: {
        onOpened: () => {
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          loadingBar = null;
        }
      }
    });
  }

  function hideLoadingBar() {
    if (loadingBar != null) {
      loadingBar.$destroy();
      loadingBar = null;
    }
  }

  async function setup() {
    showLoadingBar()
    const rollbackPassworHash = await getPasswordHash()
    const rollbackPublicKey = await getPublicKey();
    const rollbackEncryptedPrivateKey = await getEncryptedPrivateKey();
    const rollbackCollections = await getAllPasswordVault();

    try {
      checkPasscodeRequirement(currentPasscode, 10);
      checkPasscodeRequirement(newPasscode, 10);
      const currentHash = hashPassword(currentPasscode);
      const newHash = hashPassword(newPasscode);
      if (comparePassword(currentPasscode, currentHash) && comparePassword(newPasscode, newHash)) {
        const currentPK = await convertJWKToRSAKey(JSON.parse(await aesDecrypt(rollbackEncryptedPrivateKey, currentPasscode)));
        const collections = await getAllPasswordVault();
        for (let _key in collections) {
          let chunks: Array<string> = [];
          for (let i=0;i<collections[_key].encrypted.length;i++) {
            const decrypted = await rsaDecrypt(currentPK, collections[_key].encrypted[i]);
            chunks.push(decrypted);
          }
          collections[_key].encrypted = chunks;
        }
        const key = await generateRSAKey();
        let publicKey = await convertRSAKeyToJWK(key.publicKey);
        let privateKey = await convertRSAKeyToJWK(key.privateKey);
        const encryptPrivateKey = await aesEncrypt(JSON.stringify(privateKey), newPasscode);
        for (let _key in collections) {
          let chunks: Array<string> = [];
          for (let i=0;i<collections[_key].encrypted.length;i++) {
            const decrypted = await rsaEncrypt(key.publicKey, collections[_key].encrypted[i]);
            chunks.push(decrypted);
          }
          collections[_key].encrypted = chunks;
        }
        await setPasswordHash(newHash);
        await setPublicKey(publicKey);
        await setEncryptedPrivateKey(encryptPrivateKey);
        for (let _key in collections) {
          await pushIntoPasswordVault(_key, collections[_key]);
        }
        hideLoadingBar();
        onSuccess(newPasscode);
      } else {
        hideLoadingBar();
        throw("Fail hashing passcode");
      }
    } catch (err) {
      if (err.toString() !== "Fail hashing passcode") {
        await setPasswordHash(rollbackPassworHash);
        await setPublicKey(rollbackPublicKey);
        await setEncryptedPrivateKey(rollbackEncryptedPrivateKey);
        for (let key in rollbackCollections) {
          await pushIntoPasswordVault(key, rollbackCollections[key]);
        }
      }
      hideLoadingBar();
      onError(err);
    }
  }

  onMount(() => {
    navInstance.attachListener();
    softwareKey = new SoftwareKey({
      target: document.body,
      props: {
        isInvert: false,
        leftText: 'Show',
        centerText: 'CONTINUE',
        rightText: 'Cancel'
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
        <Separator title="Current Passcode" />
        <div class="passcode-input">
          <Passcode bind:this={refCurrentPasscode} className={"navClassModal"} bind:passcode="{currentPasscode}" />
        </div>
        <Separator title="New Passcode" />
        <div class="passcode-input">
          <Passcode bind:this={refNewPasscode} className={"navClassModal"} bind:passcode="{newPasscode}" />
        </div>
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
    background-color: #ffffff;
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
    overflow: scroll;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
  }
  .kai-dialog > .kai-dialog-content > .kai-dialog-body  > #container {
    width: 100%;
  }
  .kai-dialog > .kai-dialog-content > .kai-dialog-body  > #container > .passcode-input {
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    background-color: #e6e6e6;
  }
</style>
