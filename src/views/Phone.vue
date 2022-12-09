<template>
<div class="flex">
  <div class="w-1/2 border-r p-1">
    <el-form :model="pbxConfig" label-width="100px">
      <el-form-item label="WS URL">
        <el-input v-model="pbxConfig.wsUrl"/>
      </el-form-item>
      <el-form-item label="Domain">
        <el-input v-model="pbxConfig.domain"/>
      </el-form-item>
      <el-row :gutter="5">
        <el-col :span="12">
          <el-form-item label="Ext">
            <el-input v-model="pbxConfig.ext"/>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Password">
            <el-input v-model="pbxConfig.password"/>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item>
        <el-button type="primary" plain @click="handleOnRegister">Register</el-button>
      </el-form-item>    
    </el-form>
  </div>
  <div class="w-1/2 flex flex-col p-1">
    <div class="bg-slate-400 h-20 p-1">
      Register Status: {{registerStatus}}
    </div>
    <el-input v-model="callNumber" size="default"/>
    <div class="flex flex-row-reverse mt-1"> 
      <el-button class="" size="default" type="success" icon="PhoneFilled" @click="handleOnMakeCall"></el-button>
      <el-button class="" size="default" type="danger" icon="CloseBold" @click="handleOnTerminateCall"></el-button>
      <el-button class="" size="default" type="warning" @click="handleOnDebug">Debug</el-button>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import type { PbxProfile } from '@/domain/pbx-profile';
import UserAgentManager from '@/managers/UserAgentManager';
import type { RegistererState } from 'sip.js';
import { ref } from 'vue';
const storageId="mtinySipPhone";

const pbxConfig = ref(<PbxProfile>(JSON.parse(localStorage.getItem(storageId)||"{}") || {}));
const callNumber = ref('');
const registerStatus=ref('');
const callStatus=ref('');
let sipManager:UserAgentManager;

function handleOnRegister(){
  localStorage.setItem(storageId, JSON.stringify(pbxConfig.value));

  sipManager = new UserAgentManager(
    pbxConfig.value,
    (state:RegistererState)=>{
      registerStatus.value = state;
    }
  );
}

function handleOnMakeCall(){
  sipManager.MakeCall(callNumber.value);
}
function handleOnTerminateCall(){
  sipManager.Hangup();
}
function handleOnDebug(){
  
}
</script>