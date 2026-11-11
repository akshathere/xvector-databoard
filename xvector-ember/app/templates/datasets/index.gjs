// app/templates/datasets/index.gjs
import RouteTemplate from 'ember-route-template';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { LinkTo } from '@ember/routing';

const not = (val) => !val;

class DatasetList extends Component {
  @service api;

  @tracked datasets = this.args.model.datasets;
  @tracked total = this.args.model.total;
  @tracked limit = 10;
  @tracked offset = 0;
  @tracked isUploading = false;
  @tracked error = '';
  @tracked datasetName = '';


  get currentPage() {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get hasPrevPage() {
    return this.offset > 0;
  }

  get hasNextPage() {
    return this.offset + this.limit < this.total;
  }

  loadDatasets = async () => {
    try {
      const res = await this.api.request(
        `/dataset?limit=${this.limit}&offset=${this.offset}`
      );

      // Extract the array from res.data (or res.datasets / res.items)
      if (Array.isArray(res)) {
        this.datasets = res;
        this.total = res.length;
      } else {
        this.datasets = res.data || res.datasets || res.items || [];
        this.total = res.total ?? this.datasets.length;
      }
    } catch (err) {
      this.error = err.message;
    }
  };

  updateName = (e) => {
    this.datasetName = e.target.value;
  };

  handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = this.datasetName.trim();
    if (!name) {
      this.error = 'Please enter a dataset name before choosing a file.';
      event.target.value = '';
      return;
    }

    this.isUploading = true;
    this.error = '';

    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);

    try {
      // Waits for FastAPI to finish saving the file & inserting into PostgreSQL
      await this.api.request('/dataset', {
        method: 'POST',
        body: formData,
      });
      this.datasetName = '';
      this.offset = 0;
      await this.loadDatasets();
    } catch (err) {
      this.error = err.message;
    } finally {
      this.isUploading = false;
      event.target.value = '';
    }
  };

  deleteDataset = async (datasetId) => {
    try {
      await this.api.request(`/dataset/${datasetId}`, { method: 'DELETE' });
      await this.loadDatasets();
    } catch (err) {
      this.error = err.message;
    }
  };

  prevPage = () => {
    if (this.hasPrevPage) {
      this.offset = Math.max(0, this.offset - this.limit);
      this.loadDatasets();
    }
  };

  nextPage = () => {
    if (this.hasNextPage) {
      this.offset += this.limit;
      this.loadDatasets();
    }
  };

  <template>
    <div class="datasets-page">
      <header class="topbar">
        <h1>xVector Datasets</h1>
        <div>
          <span>{{this.api.userEmail}}</span>
          <button type="button" {{on "click" this.api.logout}}>Logout</button>
        </div>
      </header>

      <section class="upload-box">
        <label>
          <strong>Dataset name:</strong>
          <input
            type="text"
            placeholder="e.g. Sales 2026"
            value={{this.datasetName}}
            disabled={{this.isUploading}}
            {{on "input" this.updateName}}
          />
        </label>

        <label>
          <strong>Upload CSV Dataset:</strong>
          <input
            type="file"
            accept=".csv"
            disabled={{this.isUploading}}
            {{on "change" this.handleFileUpload}}
          />
        </label>

        {{#if this.isUploading}}
          <span class="uploading-status">Uploading & saving CSV (please wait)...</span>
        {{/if}}
      </section>

      {{#if this.error}}
        <p class="error-banner">{{this.error}}</p>
      {{/if}}

      <table class="dataset-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Rows</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {{#each this.datasets as |ds|}}
            <tr>
              <td>{{ds.id}}</td>
              <td>{{ds.name}}</td>
              <td>{{ds.row_count}}</td>
              <td>
                <LinkTo @route="datasets.detail" @model={{ds.id}}>
                  Analyze & Plot →
                </LinkTo>
                <button type="button" {{on "click" (fn this.deleteDataset ds.id)}}>
                  Delete
                </button>
              </td>
            </tr>
          {{/each}}
        </tbody>
      </table>

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

export default RouteTemplate(DatasetList);