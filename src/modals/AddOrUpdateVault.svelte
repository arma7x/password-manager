<script lang="ts">

  import { onMount, onDestroy } from 'svelte';
  import { createKaiNavigator } from '../utils/navigation.ts';
  import { SoftwareKey, TextInputField, TextAreaField, LoadingBar } from '../components/index.ts';
  import Passcode from './Passcode.svelte';
  import * as WebCryptoVault from '../utils/WebCryptoVault.ts';
  import QRScanner from './QRScanner.svelte';

  export let title: string = 'Modal';
  export let id: string | null;
  export let alias: string = '';
  export let name: string = '';
  export let data: string = '';
  export let onSuccess: Function = (passcode: string) => {};
  export let onError: Function = (error: any) => {};
  export let onOpened: Function = () => {};
  export let onClosed: Function = () => {};

  const navClass: string = "navClassModal";

  let softwareKey: SoftwareKey;
  let loadingBar: LoadingBar;
  let qrScanner: QRScanner;

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: function(evt) {
      scanQR(navInstance.verticalNavIndex);
    },
    softkeyRightListener: function(evt) {
      onSuccess(Promise.resolve(null));
    },
    enterListener: async function(evt) {
      let publicKey = await WebCryptoVault.convertJWKToRSAKey(await WebCryptoVault.getPublicKey());
      if (publicKey != null) {
        if (name == "")
          throw("name required");
        if (alias == "")
          throw("alias required");
        if (data == "")
          throw("data required");
        showLoadingBar();
        try {
          const result = await WebCryptoVault.storeIntoPasswordVault(id, alias, name, data, publicKey);
          hideLoadingBar();
          onSuccess(result);
        } catch (err) {
          hideLoadingBar();
          onError(err);
        }
      }
    },
    backspaceListener: function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  onMount(() => {
    onOpened();
    navInstance.attachListener();
    softwareKey = new SoftwareKey({
      target: document.body,
      props: {
        isInvert: true,
        leftText: 'QR-Code',
        centerText: 'SAVE',
        rightText: 'Cancel'
      }
    });
  })

  onDestroy(() => {
    navInstance.detachListener();
    softwareKey.$destroy();
    onClosed();
  })

  function scanQR(index: number) {
    qrScanner = new QRScanner({
      target: document.body,
      props: {
        title: 'Scan QR-Code',
        onBackspace: (evt) => {
          qrScanner.$destroy();
          evt.preventDefault();
          evt.stopPropagation();
        },
        onOpened: () => {
          document.activeElement.blur();
          navInstance.detachListener();
        },
        onClosed: () => {
          navInstance.attachListener();
          navInstance.verticalNavIndex = index;
          setTimeout(() => {
            navInstance.navigateListNav(0);
            setTimeout(() => {
              const cursor = document.getElementsByClassName(navClass)[navInstance.verticalNavIndex];
              if (cursor) {
                cursor.classList.add('focus');
              }
            }, 150)
          }, 150);
          qrScanner = null;
        },
        callback: (token) => {
          qrScanner.$destroy();
          if (index == 0) {
            alias = token;
          } else if (index == 1) {
            data = token;
          } else if (index == 2) {
            name = token;
          }
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

  function onInput(evt) {
    if (navInstance.verticalNavIndex == 0) {
      alias = evt.target.value;
    } else if (navInstance.verticalNavIndex == 1) {
      data = evt.target.value;
    } else if (navInstance.verticalNavIndex == 2) {
      name = evt.target.value;
    }
  }

  function onFocus(evt) {}

  function onBlur(evt) {}

</script>

<svelte:options accessors/>

<div class="kai-dialog">
  <div class="kai-dialog-content">
    <div class="kai-dialog-header">{title}</div>
    <div class="kai-dialog-body">
      <TextInputField className="{navClass}" label={null} placeholder="Short description" value="{alias}" type="text" {onInput} {onFocus} {onBlur} />
      <TextAreaField className="{navClass}" label={null} placeholder="Enter sensitive data here" value="{data}" type="text" rows={4} {onInput} {onFocus} {onBlur}/>
      <TextInputField className="{navClass}" label={null} placeholder="Maybe a username" value="{name}" type="text" {onInput} {onFocus} {onBlur} />
    </div>
  </div>
</div>

<style>
  .kai-dialog {
    width: 100%;
    height: calc(100%);
    bottom: 30px;
    position: fixed;
    background-color: rgba(0, 0, 0, 0.6);
  }
  .kai-dialog > .kai-dialog-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100% - 60px);
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
    color: #313131;
    background-color: #cccccc;
    font-weight: 200;
  }
  .kai-dialog > .kai-dialog-content > .kai-dialog-body {
    width: 100%;
    max-height: calc(100% - 60px);
    height: 236px;
    overflow: scroll;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
  }
</style>
