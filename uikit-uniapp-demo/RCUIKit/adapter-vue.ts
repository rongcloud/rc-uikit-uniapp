import Vue from 'vue';

let vueVersion: number;
// #ifndef VUE3
import VueCompositionAPI from '@vue/composition-api';

export * from '@vue/composition-api';
Vue.use(VueCompositionAPI);

vueVersion = 2;
// #endif

// #ifdef VUE3
export * from 'vue';
vueVersion = 3;
// #endif

console.log(`vue version is ${vueVersion}`);
export { vueVersion };
