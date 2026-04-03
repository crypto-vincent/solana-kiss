<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-title-before>
      <img
        src="/logo.png"
        alt="logo"
        style="width:32px;height:32px;margin-right:8px;display:block;"
      >
    </template>
  </Layout>
</template>
