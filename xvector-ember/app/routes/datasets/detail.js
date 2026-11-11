// app/routes/datasets/detail.js
import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class DatasetsDetailRoute extends Route {
  @service api;

  async model(params) {
    const datasetId = params.dataset_id;
    
    const preview = await this.api.request(`/datasets/${datasetId}/preview`);
    const rows = preview.data || preview.items || preview.rows || [];
    const columns = preview.columns || Object.keys(rows[0] || {});
    const totalRows = preview.total ?? rows.length;

    const xCol = columns[0];
    const yCol = columns[1] || columns[0];
    
    let compute = null;
    let plot = null;

    if(xCol) {
      [compute, plot] = await Promise.allSettled([
        this.api.request(`/dataset/${datasetId}/compute`, {
          method: 'POST',
          body: JSON.stringify({ column: xCol, operation: 'min' })
        }),
        this.api.request(`/datasets/${datasetId}/plot`, {
          method: 'POST',
          body: JSON.stringify({ col1 : xCol, col2: yCol }),
        })
      ]);
    }
    return {
      datasetId,
      rows,
      columns,
      totalRows,
      computeResult: compute?.status === 'fulfilled' ? compute.value : null,
      computeError: compute?.status === 'rejected' ? compute.reason.message : '',
      plotData: plot?.status === 'fulfilled' ? plot.value : null,
      plotError: plot?.status === 'rejected' ? plot.reason.message : '',
      };
    }
  }