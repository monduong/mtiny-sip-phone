import type { PbxProfile } from "@/domain/pbx-profile";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const usePbxStore = defineStore('pbxStore', ()=>{
  const _pbxConfig = ref(<PbxProfile>{});
  const Config = computed(()=> _pbxConfig.value);

  function setConfig(config: PbxProfile){
    _pbxConfig.value = config;
  }

  return {
    setConfig, 
    Config
  };
});