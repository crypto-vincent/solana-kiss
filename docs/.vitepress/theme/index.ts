import DefaultTheme from "vitepress/theme";
import MyLayout from "./Layout.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout: MyLayout,
};
