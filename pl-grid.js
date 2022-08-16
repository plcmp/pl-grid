import { css, html, PlElement } from "polylib";

import '@plcmp/pl-virtual-scroll';

import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";
import "@plcmp/pl-data-tree";

import { PlResizeableMixin, throttle } from '@plcmp/utils';

import "./pl-grid-column.js";

class PlGrid extends PlResizeableMixin(PlElement) {
    static properties = {
        data: { type: Array, value: () => [], observer: '_dataObserver' },
        selected: { type: Object, value: () => null, observer: '_selectedObserver' },
        tree: { type: Boolean, observer: '_treeModeChange' },
        _vdata: { type: Array, value: () => [] },
        _columns: { type: Array, value: () => [] },
        keyField: { type: String },
        pkeyField: { type: String },
        hasChildField: { type: String, value: '_haschildren' }
    }

    static css = css`
        :host {
            width: 100%;
            height: 100%;
            border: 1px solid var(--grey-light);
            border-radius: var(--border-radius);
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
            --pl-grid-cell-min-height: var(--base-size-lg);
            --pl-grid-header-min-height: var(--base-size-lg);
            --pl-grid-active-color: var(--primary-lightest);
            --pl-grid-active-text-color: var(--text-color);
        }

        #container {
            width: 100%;
            height: 100%;
            overflow: auto;
            contain: strict;
            position: relative;
        }

        #headerContainer{
            display: flex;
            width: 100%;
            position: sticky;
            background-color: var(--grey-lightest);
            z-index: 1;
            top: 0;
        }

        #header{
            display: flex;
            border-bottom: 1px solid var(--grey-light);
            position: sticky;
            top: 0;
            flex: 1;
            will-change: width;
        }

        .headerEl[fixed], 
        .headerEl[action]  {
            position: sticky;
            z-index: 3;
        }

        .headerEl[action] {
            right: 0;
        }
        
        .headerEl[hidden] {
            display: none;
        }

        #rowsContainer {
            height: 100%;
            width: 100%;
            position: relative;
            display: flex;
            flex-direction: column;
        }

        .row {
            display: flex;
            flex-direction: row;
            border-top: 1px solid transparent;
            border-bottom: 1px solid var(--grey-light);
            background-color: var(--background-color);
            width: 100%;
            flex-shrink: 0;
            box-sizing: border-box;
        }

        .cell{
            display: flex;
            padding: var(--space-xs) var(--space-sm); 
            align-items: center;
            height: var(--pl-grid-cell-min-height);
            color: var(--text-color);
            overflow: hidden;
            background-color: inherit;
            will-change: width;
            position: sticky;
            box-sizing: border-box;
            flex-shrink: 0;
            white-space: nowrap;
        }

        .cell[fixed] {
            position: sticky;
            border-right: 1px solid var(--grey-light);
            background-color: var(--grey-lightest);
            z-index:1;
        }

        .cell[action] {
            position: sticky;
            right: 0;
            border-left: 1px solid var(--grey-light);
            background-color: var(--grey-lightest);
            z-index:1;
        }

        .cell[hidden] {
            display: none;
        }

        .row:hover, 
        .row:hover .cell,
        .row[active], 
        .row[active] .cell{
            white-space: normal;
            background-color: var(--pl-grid-active-color);
            color: var(--pl-grid-active-text-color);
            --pl-icon-fill-color: var(--pl-grid-active-text-color);
        }

        .cell-content {
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            background-color: inherit;
            line-height: 24px;
        }

        .top-toolbar ::slotted(*) {
            width: 100%;
            padding: var(--space-sm);
            box-sizing: border-box;
            border-bottom: 1px solid var(--grey-light);

        }

        .bottom-toolbar ::slotted(*) {
            border-top: 1px solid var(--grey-light);
            width: 100%;
            padding: var(--space-sm);
            box-sizing: border-box;
        }

        pl-virtual-scroll {
            display: none;
        }
    `;
    static treeFirstCellTemplate = html`<span style$="[[_getRowPadding(row, column.index)]]">
                                        <pl-icon-button variant="link" iconset="pl-default" icon="[[_getTreeIcon(row)]]"
                                                        on-click="[[_onTreeNodeClick]]"></pl-icon-button>
                                    </span>`;
    static template = html`
        <div class="top-toolbar">
            <slot name="top-toolbar"></slot>
        </div>
        <div id="container">
            <div id="headerContainer">
                <div id="header">
                    <template d:repeat="[[_columns]]" d:as="column">
                        <div class="headerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" style$="[[_getCellStyle(column.index, column.width)]]">
                            <slot name="[[_getSlotName(column.index)]]"></slot>
                        </div>
                    </template>
                </div>
            </div>
            <div id="rowsContainer">
                <pl-virtual-scroll canvas="[[$.rowsContainer]]" items="{{_vdata}}" as="row" id="scroller">
                    <template id="tplRow">
                        <div class="row" active$="[[_isRowActive(row, selected)]]" on-click="[[_onRowClick]]" on-dblclick="[[_onRowDblClick]]">
                            <template d:repeat="[[_columns]]" d:as="column">
                                <div style$="[[_getCellStyle(column.index, column.width)]]" class="cell" hidden$="[[column.hidden]]" fixed$="[[column.fixed]]" action$="[[column.action]]">
                                    [[getTemplateForCell(tree,column.index)]]
                                    <span class="cell-content">[[column.cellTemplate]]</span>
                                </div>
                            </template>
                        </div>
                    </template>
                </pl-virtual-scroll>
            </div>
        </div>
        <div class="bottom-toolbar">
            <slot name="bottom-toolbar"></slot>
        </div>
        <pl-data-tree bypass="[[!tree]]" key-field="[[keyField]]" pkey-field="[[pkeyField]]" has-child-field="[[hasChildField]]" in="{{data}}" out="{{_vdata}}"></pl-data-tree>
    `;

    connectedCallback() {
        super.connectedCallback();
        if (this.data?.control) {
            if (this.data.control && this.tree) {
                this.data.control.treeMode = {
                    hidValue: undefined,
                    keyField: this.keyField,
                    hidField: this.pkeyField
                };

            } else if (this.data.control) {
                delete this.data.control.treeMode;
            }
        }

        this.addEventListener('column-attribute-change', this.onColumnAttributeChange);

        const resizeObserver = new ResizeObserver(() => {
            let throttler = throttle(() => {
                this.reactToResize();
            }, 100)

            throttler();
        });
        // let nested column components upgrade, then call _init method
        setTimeout( ()=>this._init(),0);

        resizeObserver.observe(this.$.headerContainer);

        const observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    this._init();
                }
            }
        });

        observer.observe(this, { attributes: false, childList: true, subtree: true });
    }

    _dataObserver(data, old, mut) {
        if (mut.action === 'splice' && mut.path === 'data') {
            if(mut?.deleted?.includes(this.selected)) {
                this.selected = null;
            }
        }
    }

    onColumnAttributeChange(event) {
        const { index, attribute, value } = event.detail;
        if(this._columns[index]) {
            if (attribute === 'width') {
                this._changeColumnWidth(this._columns[index], value);
            }
    
            if (attribute === 'sort') {
                this._changeColumnSort(this._columns[index], value)
            }
        }
    }

    reactToResize() {
        this.$.scroller.render();
        this.$.rowsContainer.style.width = this.$.headerContainer.scrollWidth + 'px';
    }

    _init() {
        const columnsNodes = Array.prototype.slice.call(this.querySelectorAll('pl-grid-column'));
        this._columns = columnsNodes.map((column, index) => {
            column.setAttribute('slot', `column-${index}`);
            const info = {
                kind: column.kind,
                header: column.header,
                hidden: column.hidden || false,
                field: column.field,
                width: column.width ? parseInt(column.width) : null,
                resizable: column.resizable,
                fixed: column.fixed || false,
                action: column.action || false,
                index: index,
                cellTemplate: column._cellTemplate
            };

            column._index = index;
            return info;
        });
        this.reactToResize();
    }

    _isRowActive(row, selected) {
        return row === selected;
    }


    _changeColumnSort(column, sort) {
        let sorts = [...this.data.sorts] || [];
        const ind = sorts.findIndex(item => item.field === column.field);
        if (ind >= 0) {
            sorts.splice(ind, 1);
        }

        let newSort = {
            field: column.field,
            sort: sort
        };

        sorts.splice(0, 0, newSort);
        this.set('data.sorts', sorts);
    }

    _changeColumnWidth(column, width) {
        this.set(`_columns.${column.index}.width`, width);
        this.reactToResize();
    }

    _getSlotName(index) {
        return `column-${index}`;
    }

    _getCellStyle(index) {
        const column = this._columns[index];
        const style = [];

        if (!column) {
            return '';
        }

        if (column.width) {
            style.push(`width: ${column.width}px`);
        } else {
            style.push(`flex: 1;`);
        }

        if (column.fixed) {
            const left = column.index === 0 ? '0' : this._ti._pti ? this._ti._pti.ctx._columns[column.index - 1].width + 'px' : this._ti.ctx._columns[column.index - 1].width + 'px';
            style.push(`left: ${left}`);
        }

        return style.join(';');
    }

    _onRowClick(event) {
        if (event.model.row) {
            this.selected = event.model.row;
        }

        this.dispatchEvent(new CustomEvent('rowClick', { detail: { model: this.selected } }))
    }

    _onRowDblClick(event) {
        const ev = new CustomEvent('rowDblclick');
        ev.model = event.model;
        ev.originalEvent = event;
        this.dispatchEvent(ev);

        if (this.tree) {
            this._onTreeNodeClick(event);
        }
    }

    _onTreeNodeClick(event) {
        event.stopPropagation();
        if (event.model.row._haschildren === false) {
            return;
        }
        let idx = this.data.indexOf(event.model.row);
        this.set(`data.${idx}._opened`, !event.model.row._opened);
    }

    _getRowPadding(row, index) {
        if (index === 0 && (this.tree)) {
            return `padding-left: ${row._level * 16 + 'px'}`;
        }
        return 'display:none;';
    }

    _getTreeIcon(row) {
        if (!row._haschildren) {
            return '';
        }

        return row._opened ? 'triangle-down' : 'triangle-right';
    }

    _selectedObserver(val) {
        if (!val) {
            return;
        }
        const parents = [];
        if (this.tree && !val._opened) {
            while (val._pitem != null) {
                val = val._pitem;
                parents.push(val);
            }

            parents.reverse().forEach((el) => {
                if (!el._opened) {
                    const idx = this._vdata.indexOf(el);
                    this.set(`_vdata.${idx}._opened`, true);
                }
            })
        }
    }
    _treeModeChange() {
        if (this.data.control && this.tree) {
            this.data.control.treeMode = {
                hidValue: undefined,
                keyField: this.keyField,
                hidField: this.pkeyField
            };
        } else if (this.data.control) {
            delete this.data.control.treeMode;
        }
    }
    getTemplateForCell(tree,index) {
        return tree && index===0 ? PlGrid.treeFirstCellTemplate : undefined ;
    }
}

customElements.define('pl-grid', PlGrid);
