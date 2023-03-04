<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation.ts';
  import { onMount, onDestroy } from 'svelte';
  import SetupPasscode from '../SetupPasscode.svelte';
  import RequiredPasscode from '../RequiredPasscode.svelte';
  import * as WebCryptoVault from '../utils/WebCryptoVault.ts';
  import { Toast, Toaster } from '../components/index.ts';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;

  let name: string = 'Password Manager';

  let passcode: string = '';
  let passcodeModal: SetupPasscode | RequiredPasscode;

  let navOptions = {
    verticalNavClass: 'vertClass',
    softkeyLeftListener: function(evt) {
      console.log('softkeyLeftListener', name);
    },
    softkeyRightListener: function(evt) {
      console.log('softkeyRightListener', name);
    },
    enterListener: function(evt) {
      console.log('enterListener', name);
      goto('demo');
    },
    backspaceListener: function(evt) {
      window.close();
    }
  };

  let navInstance = createKaiNavigator(navOptions);

  onMount(async () => {
    console.log('onMount', name);
    const { appBar, softwareKey } = getAppProp();
    appBar.setTitleText(name);
    softwareKey.setText({ left: 'LSK', center: 'DEMO', right: 'RSK' });
    navInstance.attachListener();
    // await WebCryptoVault.dbAppConfig.clear()
    const hashedPasscode = await WebCryptoVault.getPasswordHash()
    if (hashedPasscode == null) {
      passcodeModal = new SetupPasscode({
        target: document.body,
        props: {
          title: 'Setup Passcode',
          onSuccess: (_passcode: string) => {
            passcode = _passcode;
            passcodeModal.$destroy();
          },
          onError: (err: any) => {
            toastMessage(err.toString());
          },
          onOpened: () => {
            navInstance.detachListener();
          },
          onClosed: () => {
            navInstance.attachListener();
            passcodeModal = null;
          }
        }
      });
    } else {
      passcodeModal = new RequiredPasscode({
        target: document.body,
        props: {
          title: 'Passcode Required!',
          hashedPasscode: hashedPasscode,
          onSuccess: (_passcode: string) => {
            passcode = _passcode;
            passcodeModal.$destroy();
          },
          onError: (err: any) => {
            toastMessage(err.toString());
          },
          onOpened: () => {
            navInstance.detachListener();
          },
          onClosed: () => {
            navInstance.attachListener();
            passcodeModal = null;
          }
        }
      });
    }
  });

  onDestroy(() => {
    console.log('onDestroy', name);
    navInstance.detachListener();
  });

  function toastMessage(text) {
    const t = new Toast({
      target: document.body,
      props: {
        options: {}
      }
    })
    Toaster.push(text , {
      dismissable: false,
      intro: { y: -64 },
      duration: 2000,
      onpop: () => {
        setTimeout(() => {
          t.$destroy();
        }, 4000);
      }
    })
  }

</script>

<main id="welcome-screen" data-pad-top="28" data-pad-bottom="30">
  <h3>Hello {passcode}</h3>
  <div class="vertical">
    <div class="vertClass">Vertical 1</div>
    <div class="vertClass">Vertical 2</div>
  </div>
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
  #welcome-screen > .vertical {
    display:flex;
    flex-direction:column;
    align-items: center;
    justify-content: center;
  }
  :global(#welcome-screen > .vertical > .vertClass) {
    background-color: #ffffff;
    color: #000000;
  }
  :global(#welcome-screen > .vertical > .vertClass.focus) {
    background-color: red!important;
    color: #fff!important;
  }
</style>
