<template>
  <NuxtLayout>
    <NuxtPage />
    <UNotifications
      :ui="{
        wrapper: 'fixed flex flex-col justify-start z-[55]',
        position: 'top-0 end-0',
        width: 'w-full sm:w-96',
      }"
    />
  </NuxtLayout>
</template>
