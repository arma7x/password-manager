<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation.ts';
  import { onMount, onDestroy } from 'svelte';
  import Modal from '../Modal.svelte';
  import * as crypto from '../utils/WebCryptoVault.ts';
  import { Toast, Toaster } from '../components/index.ts';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;

  let name: string = 'Welcome';

  let passcode: string = '';
  let modal: Modal;

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
    //try {
      //console.time("WebCryptoVault");
      //await crypto.test("aB1?", "Hey, i'm secured");
      //console.timeEnd("WebCryptoVault");
    //} catch (err) {
      //console.error(err);
    //}
    if (passcode == '') {
      modal = new Modal({
        target: document.body,
        props: {
          title: 'Passcode',
          onSuccess: (_passcode: string) => {
            passcode = _passcode;
            modal.$destroy();
          },
          onError: (err: any) => {
            toastMessage(err.toString());
          },
          onOpened: () => {
            navInstance.detachListener();
          },
          onClosed: () => {
            navInstance.attachListener();
            modal = null;
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
