// app/modifiers/echarts.js
import Modifier from 'ember-modifier';
import { registerDestructor } from '@ember/destroyable';
import * as echarts from 'echarts';

export default class EchartsModifier extends Modifier {
  chartInstance = null;

  modify(element, [options]) {
    if (!this.chartInstance) {
      this.chartInstance = echarts.init(element);

      const handleResize = () => this.chartInstance?.resize();
      window.addEventListener('resize', handleResize);

      // Cleanup when component unmounts (like useEffect cleanup return)
      registerDestructor(this, () => {
        window.removeEventListener('resize', handleResize);
        this.chartInstance?.dispose();
      });
    }

    if (options) {
      // notMerge: true ensures switching from scatter -> bar clears old axes cleanly
      this.chartInstance.setOption(options, { notMerge: true });
    }
  }
}