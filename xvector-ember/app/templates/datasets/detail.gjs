// app/templates/datasets/detail.gjs
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { get } from '@ember/helper';
import { LinkTo } from '@ember/routing';
import echarts from 'xvector-ember/modifiers/echarts';

const eq = (a, b) => a === b;
const not = (val) => !val;

class ComputeView extends Component {
  @service api;
  // Table pagination state
  @tracked columns = this.args.model.columns;
  @tracked rows = this.args.model.rows;
  @tracked totalRows = this.args.model.totalRows;
  @tracked limit = 25;
  @tracked offset = 0;

  // Compute state
  @tracked selectedComputeCol = this.args.model.columns[0] || '';
  @tracked selectedOperation = 'min'; // 'min' | 'max' | 'sum' | 'mexwf'
  @tracked computeResult = this.args.model.computeResult;
  @tracked computeError = this.args.model.computeError;

  // Plot state
  @tracked selectedXCol = this.args.model.columns[0] || '';
  @tracked selectedYCol = this.args.model.columns[1] ?? this.args.model.columns[0] ?? '';
  @tracked chartType = 'line';
  @tracked plotData = this.args.model.plotData;
  @tracked plotError = this.args.model.plotError;

  get datasetId() {
    return this.args.model.datasetId;
  }

  get currentPage() {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get hasPrevPage() {
    return this.offset > 0;
  }

  get hasNextPage() {
    return this.offset + this.limit < this.totalRows;
  }

  get chartOptions() {
    if (!this.plotData || !this.selectedXCol || !this.selectedYCol) {
      return null;
    }

    // /plot returns { col1, col2, agg, data: [{ x, y }, ...] }
    const points = Array.isArray(this.plotData)
      ? this.plotData
      : this.plotData.data || [];

    if (this.chartType === 'scatter') {
      return {
        tooltip: { trigger: 'item' },
        xAxis: { type: 'value', name: this.selectedXCol },
        yAxis: { type: 'value', name: this.selectedYCol },
        series: [
          {
            name: this.selectedYCol,
            type: 'scatter',
            data: points.map((p) => [Number(p.x), Number(p.y)]),
          },
        ],
      };
    }

    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        name: this.selectedXCol,
        data: points.map((p) => p.x),
      },
      yAxis: {
        type: 'value',
        name: this.selectedYCol,
      },
      series: [
        {
          name: this.selectedYCol,
          type: this.chartType,
          data: points.map((p) => Number(p.y)),
          smooth: this.chartType === 'line',
        },
      ],
    };
  }

  loadRows = async () => {
    try {
      const res = await this.api.request(`/dataset/${this.datasetId}/preview`);
      this.rows = res.data || res.items || res.rows || [];
      this.totalRows = res.total ?? this.rows.length;
      if (this.columns.length === 0) {
        this.columns = res.columns || Object.keys(this.rows[0] || {});
      }
    } catch (err) {
      this.computeError = err.message;
    }
  };

  // Sends both { column, operation } required by FastAPI ComputeRequest
  runCompute = async () => {
    if (!this.selectedComputeCol || !this.selectedOperation) return;
    this.computeError = '';
    try {
      this.computeResult = await this.api.request(
        `/dataset/${this.datasetId}/compute`,
        {
          method: 'POST',
          body: JSON.stringify({
            column: this.selectedComputeCol,
            operation: this.selectedOperation,
          }),
        }
      );
    } catch (err) {
      this.computeResult = null;
      this.computeError = err.message;
    }
  };

  // Sends col1 & col2 query parameters to FastAPI /plot endpoint
  loadPlot = async () => {
    if (!this.selectedXCol || !this.selectedYCol) return;
    this.plotError = '';
    try {
      const query = new URLSearchParams({
        col1: this.selectedXCol,
        col2: this.selectedYCol,
      });
      this.plotData = await this.api.request(
        `/dataset/${this.datasetId}/plot?${query.toString()}`
      );
    } catch (err) {
      this.plotData = null;
      this.plotError = err.message;
    }
  };

  changeComputeCol = async (e) => {
    this.selectedComputeCol = e.target.value;
    await this.runCompute();
  };

  changeOperation = async (e) => {
    this.selectedOperation = e.target.value;
    await this.runCompute();
  };

  changeXCol = async (e) => {
    this.selectedXCol = e.target.value;
    await this.loadPlot();
  };

  changeYCol = async (e) => {
    this.selectedYCol = e.target.value;
    await this.loadPlot();
  };

  changeChartType = (e) => {
    this.chartType = e.target.value;
  };

  prevPage = () => {
    if (this.hasPrevPage) {
      this.offset = Math.max(0, this.offset - this.limit);
      this.loadRows();
    }
  };

  nextPage = () => {
    if (this.hasNextPage) {
      this.offset += this.limit;
      this.loadRows();
    }
  };

  <template>
    <div class="compute-view">
      <nav>
        <LinkTo @route="datasets.index">← Back to Datasets</LinkTo>
      </nav>

      <h2>Dataset #{{this.datasetId}} — Analytics & Visualization</h2>

      {{! 1. Statistical Compute Controls }}
      <div class="controls-bar">
        <label>
          Compute Column:
          <select {{on "change" this.changeComputeCol}}>
            {{#each this.columns as |col|}}
              <option value={{col}} selected={{eq col this.selectedComputeCol}}>{{col}}</option>
            {{/each}}
          </select>
        </label>

        <label>
          Operation:
          <select {{on "change" this.changeOperation}}>
            <option value="min" selected={{eq this.selectedOperation "min"}}>Min</option>
            <option value="max" selected={{eq this.selectedOperation "max"}}>Max</option>
            <option value="sum" selected={{eq this.selectedOperation "sum"}}>Sum</option>
            <option value="mexwf" selected={{eq this.selectedOperation "mexwf"}}>MEXWF</option>
          </select>
        </label>

        <button type="button" {{on "click" this.runCompute}}>
          Run Compute
        </button>
      </div>

      {{#if this.computeError}}
        <p class="error-banner">Compute Error: {{this.computeError}}</p>
      {{/if}}

      {{#if this.computeResult}}
        <div class="stats-grid">
          <div class="stat-card">
            <strong>Column</strong>
            {{this.computeResult.column}}
          </div>
          <div class="stat-card">
            <strong>Operation</strong>
            {{this.computeResult.operation}}
          </div>
          <div class="stat-card">
            <strong>Result</strong>
            {{this.computeResult.result}}
          </div>
        </div>
      {{/if}}

      {{! 2. Plot Controls & Apache ECharts Canvas }}
      <div class="controls-bar">
        <label>
          X-Axis (col1):
          <select {{on "change" this.changeXCol}}>
            {{#each this.columns as |col|}}
              <option value={{col}} selected={{eq col this.selectedXCol}}>{{col}}</option>
            {{/each}}
          </select>
        </label>

        <label>
          Y-Axis (col2):
          <select {{on "change" this.changeYCol}}>
            {{#each this.columns as |col|}}
              <option value={{col}} selected={{eq col this.selectedYCol}}>{{col}}</option>
            {{/each}}
          </select>
        </label>

        <label>
          Chart Type:
          <select {{on "change" this.changeChartType}}>
            <option value="line" selected={{eq this.chartType "line"}}>Line</option>
            <option value="bar" selected={{eq this.chartType "bar"}}>Bar</option>
            <option value="scatter" selected={{eq this.chartType "scatter"}}>Scatter</option>
          </select>
        </label>
      </div>

      {{#if this.plotError}}
        <p class="error-banner">Plot Error: {{this.plotError}}</p>
      {{else}}
        <div
          class="echart-canvas"
          style="width: 100%; height: 420px;"
          {{echarts this.chartOptions}}
        ></div>
      {{/if}}

      {{! 3. Paginated Dynamic CSV Table Preview }}
      <h3>Paginated Dataset Rows (Page {{this.currentPage}})</h3>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              {{#each this.columns as |col|}}
                <th>{{col}}</th>
              {{/each}}
            </tr>
          </thead>
          <tbody>
            {{#each this.rows as |row|}}
              <tr>
                {{#each this.columns as |col|}}
                  <td>{{get row col}}</td>
                {{/each}}
              </tr>
            {{/each}}
          </tbody>
        </table>
      </div>

      <div class="pagination-controls">
        <button type="button" disabled={{not this.hasPrevPage}} {{on "click" this.prevPage}}>
          Previous
        </button>
        <span>Page {{this.currentPage}}</span>
        <button type="button" disabled={{not this.hasNextPage}} {{on "click" this.nextPage}}>
          Next
        </button>
      </div>
    </div>
  </template>
}

<template>
  <ComputeView @model={{@model}} />
</template>