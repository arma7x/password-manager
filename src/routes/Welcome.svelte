<script lang="ts">
  import { Route, navigate as goto } from "svelte-navigator";
  import { createKaiNavigator } from '../utils/navigation.ts';
  import { onMount, onDestroy } from 'svelte';
  import SetupPasscode from '../SetupPasscode.svelte';
  import RequiredPasscode from '../RequiredPasscode.svelte';
  import * as WebCryptoVault from '../utils/WebCryptoVault.ts';
  import { Toast, Toaster, ListView } from '../components/index.ts';

  export let location: any;
  export let navigate: any;
  export let getAppProp: Function;

  const navClass = "welcomeNavClass";

  let name: string = 'Password Manager';

  let passcode: string = '';
  let passcodeModal: SetupPasscode | RequiredPasscode;
  let collections: any = {};

  let navOptions = {
    verticalNavClass: navClass,
    softkeyLeftListener: async function(evt) {
      // await WebCryptoVault.dbAppConfig.clear();
      // await WebCryptoVault.dbPasswordVault.clear();
    },
    softkeyRightListener: function(evt) {
      console.log('softkeyRightListener', name);
    },
    enterListener: function(evt) {
      console.log('enterListener', name);
      // goto('demo');
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
    softwareKey.setText({ left: 'Reset', center: 'DEMO', right: 'RSK' });
    navInstance.attachListener();
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
            getCollections(passcode);
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

  async function getCollections(passcode) {
    let publicKey = await WebCryptoVault.convertJWKToRSAKey(await WebCryptoVault.getPublicKey());
    if (publicKey != null) {
      const temp = new Date().getTime().toString();
      // console.log('publicKey:', publicKey);
      const inserted = await WebCryptoVault.storeIntoPasswordVault(null, `name:${temp}`, `alias:${temp}`, temp, publicKey);
      // console.log('inserted:', inserted);
      const decryptedPrivateKey = await WebCryptoVault.convertJWKToRSAKey(JSON.parse(await WebCryptoVault.aesDecrypt(await WebCryptoVault.getEncryptedPrivateKey(), passcode)));
      // console.log('decryptedPrivateKey:', decryptedPrivateKey);
      const messageDecrypted = await WebCryptoVault.rsaDecrypt(decryptedPrivateKey, inserted.data.encrypted);
      // console.log('messageDecrypted:', messageDecrypted, temp);
      collections = await WebCryptoVault.getAllPasswordVault();
      navInstance.verticalNavIndex = 0;
      setTimeout(() => {
        navInstance.navigateListNav(0);
        setTimeout(() => {
          const cursor = document.getElementsByClassName(navClass)[navInstance.verticalNavIndex];
          if (cursor) {
            cursor.classList.add('focus');
          }
        }, 150)
      }, 150);
    }
  }

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
  {#each Object.keys(collections) as key }
    <ListView className="{navClass}" title="{collections[key].alias}" subtitle="{collections[key].name}" onClick={() => 1}/>
  {/each}
</main>

<style>
  #welcome-screen {
    overflow: scroll;
    width: 100%;
  }
</style>
