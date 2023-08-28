import { css, html, PlElement, Template } from "polylib";

import '@plcmp/pl-virtual-scroll';

import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";
import "@plcmp/pl-data-tree";
import "@plcmp/pl-checkbox";

import { PlResizeableMixin, throttle, PlaceHolder } from '@plcmp/utils';

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
        hasChildField: { type: String, value: '_haschildren' },
        multiSelect: { type: Boolean, value: false },
        selectedList: { type: Array, value: [] },
        _hasFooter: { type: Boolean, value: false }
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
            --pl-grid-active-color: var(--primary-lightest);
            --pl-grid-active-text-color: var(--text-color);
            background-color: var(--background-color);
        }

        #container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
            contain: strict;
            overflow: auto;
            border-radius: var(--border-radius);
        }

        #headerContainer{
            display: flex;
            width: 100%;
            position: sticky;
            background-color: var(--grey-lightest);
            z-index: 2;
            top: 0;
        }

        #footerContainer {
            display: flex;
            width: 100%;
            background-color: var(--grey-lightest);
            z-index: 2;
            bottom: 0;
            will-change: bottom;
            height: 32px;
            position: absolute;
        }

        #header{
            display: var(--pl-grid-header-display, flex);
            border-bottom: 1px solid var(--grey-light);
            position: sticky;
            top: 0;
            flex: 1;
            will-change: width;
        }

        #footer{
            display: var(--pl-grid-header-display, flex);
            border-top: 1px solid var(--grey-base);
            position: sticky;
            bottom: 0;
            flex: 1;
            will-change: width;
        }

        .footerEl {
            display: flex;
            align-items: center;
            height: 100%;
            padding: var(--space-sm);
            box-sizing: border-box;
            font: var(--header-font);
            color: var(--header-color);
        }

        .footerCell{
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .headerEl[fixed], 
        .headerEl[action],
        .footerEl[fixed],
        .footerEl[action] {
            position: sticky;
            z-index: 3;
        }

        .headerEl[action], .footerEl[action] {
            right: 0;
        }
        
        .headerEl[hidden], .footerEl[hidden] {
            display: none;
        }

        #rowsContainer {
            height: 100%;
            width: 100%;
            position: relative;
            display: flex;
            flex-direction: column;
            flex-shrink:0;
            padding-bottom: var(--footer-padding, 0);
        }

        .row {
            display: flex;
            flex-direction: row;
            border-top: 1px solid transparent;
            border-bottom: 1px solid var(--grey-light);
            background-color: var(--background-color);
            width: 100%;
            box-sizing: border-box;
            position: relative;
        }

        .row[loading]::after {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left:0;
            display: flex;
            content:'Загрузка...';
            align-items: center;
            justify-content: center;
        }

        .cell {
            display: flex;
            min-width: 0;
            padding: var(--space-sm);
            align-items: center;
            color: var(--text-color);
            background-color: inherit;
            will-change: width;
            position: relative;
            box-sizing: border-box;
            border-right: var(--pl-grid-cell-border, none);
            height: var(--pl-grid-cell-min-height, 32px);
        }

        .cell > span {
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
            line-height: 24px;
            width: 100%;
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
        }

        .row[active]{
            z-index: 1;
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
    static checkboxCellTemplate = `<pl-checkbox checked="[[_itemSelected(row, selectedList)]]" on-click="[[_onSelect]]"></pl-checkbox>`;
    static treeFirstCellTemplate = `<pl-icon-button style$="[[_getRowMargin(row, column.index)]]" variant="link" iconset="pl-default" icon="[[_getTreeIcon(row)]]" on-click="[[_onTreeNodeClick]]"></pl-icon-button>`;
    static footerTemplate = html`
    <div id="footerContainer">
        <div id="footer">
            <template d:repeat="[[_columns]]" d:as="column">
                <div class="footerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]"
                    style$="[[_getCellStyle(column.index, column.width, column._calculatedWidth)]]">
                    <div class="footerCell">
                        [[column.footerTemplate]]
                    </div>
                </div>
            </template>
        </div>
    </div>`


    static template = html`
        <div class="top-toolbar">
            <slot name="top-toolbar"></slot>
        </div>
        <div id="container">
            <div id="headerContainer">
                <div id="header">
                    <template d:repeat="[[_columns]]" d:as="column">
                        <div class="headerEl" hidden$=[[column.hidden]] fixed$=[[column.fixed]] action$="[[column.action]]" style$="[[_getCellStyle(column.index, column.width, column._calculatedWidth, 'header')]]">
                            <slot name="[[_getSlotName(column.index)]]"></slot>
                        </div>
                    </template>
                </div>
            </div>
            <div id="rowsContainer">
                <pl-virtual-scroll canvas="[[$.rowsContainer]]" items="{{_vdata}}" as="row" id="scroller">
                    <template id="tplRow">
                        <div class="row" loading$="[[_isPlaceholder(row)]]" active$="[[_isRowActive(row, selected)]]" on-click="[[_onRowClick]]" on-dblclick="[[_onRowDblClick]]">
                            <template d:repeat="[[_columns]]" d:as="column">
                                <div style$="[[_getCellStyle(column.index, column.width, column._calculatedWidth)]]" class="cell" hidden$="[[column.hidden]]" fixed$="[[column.fixed]]" action$="[[column.action]]">
                                    [[getTemplateForCell(tree, multiSelect, column.index)]]
                                    <span>[[column.cellTemplate]]</span>
                                </div>
                            </template>
                        </div>
                    </template>
                </pl-virtual-scroll>
            </div>
            [[_getFooterTemplate(_hasFooter)]]
        </div>
        <div class="bottom-toolbar">
            <slot name="bottom-toolbar"></slot>
        </div>
        <pl-data-tree bypass="[[!tree]]" key-field="[[keyField]]" pkey-field="[[pkeyField]]" has-child-field="[[hasChildField]]" in="{{data}}" out="{{_vdata}}"></pl-data-tree>
    `;

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener('column-attribute-change', this.onColumnAttributeChange);

        const resizeObserver = new ResizeObserver(throttle((resizes) => {
            this.$.rowsContainer.style.width = resizes[0].contentRect.width + 'px';
            if (this._hasFooter) this.$.footerContainer.style.width = resizes[0].contentRect.width + 'px';
            this.reactToResize();
        }, 30));

        const observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    this._init();
                }
            }
        });

        resizeObserver.observe(this.$.header);
        observer.observe(this, { attributes: false, childList: true, subtree: true });

        // let nested column components upgrade, then call _init method
        setTimeout(() => {
            if (this.data?.control) {
                this._treeModeChange();
            }
            this._init();
        }, 0);

        if (this._hasFooter) {
            this.$.container.addEventListener('scroll', throttle((e) => {
                this.$.footerContainer.style.bottom = -this.$.container.scrollTop + 'px';
            }, 15));
        }
    }

    _dataObserver(data, old, mut) {
        if (mut.action === 'splice' && mut.path == 'data') {
            if (mut?.deleted?.includes(this.selected)) {
                this.selected = null;
            }
        }

        if (mut.path != 'data' && this.selected) {
            let m = mut.path.match(/^data\.(\d*)/);
            if (m[1] == this.data.indexOf(this.selected)) {
                this.forwardNotify(mut, `data.${m[1]}`, 'selected');
            }
        }
    }

    onColumnAttributeChange(event) {
        const { index, attribute, value, init } = event.detail;
        if (this._columns[index]) {
            if (attribute === 'width') {
                this._changeColumnWidth(this._columns[index], value);
            }
            if (attribute === 'sort') {
                this._changeColumnSort(this._columns[index], value, init)
            }
            if (attribute === 'hidden') {
                this.set(`_columns.${index}.hidden`, value);
            }
        }
    }

    reactToResize() {
        this._columns.forEach((el) => {
            if (!el.width) {
                this.set(`_columns.${el.index}._calculatedWidth`, el.node.offsetWidth);
            }
        })
        setTimeout(() => {
            this.$.scroller.render();
        }, 0);
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
                justify: column.justify,
                width: column.width ? parseInt(column.width) : null,
                _calculatedWidth: null,
                resizable: column.resizable,
                fixed: column.fixed || false,
                action: column.action || false,
                index: index,
                cellTemplate: column._cellTemplate,
                footerTemplate: column._footerTemplate,
                node: column
            };

            column._index = index;
            return info;
        });

        if (this._columns.some(x => x.footerTemplate)) {
            this._hasFooter = true;
            this.$.rowsContainer.style.setProperty('--footer-padding', '32px');
        }

        this.reactToResize();
    }

    _isRowActive(row, selected) {
        return row === selected;
    }

    _changeColumnSort(column, sort, init) {
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

        // если сортировка была указана в гриде, то выставляем ее по-тихому, без уведомления о мутации
        // иначе по клику на сортировку вызываем мутацию и перезагружаем датасет 
        if (init) {
            this.data.sorts = sorts;
        } else {
            this.set('data.sorts', sorts);
        }
    }

    _changeColumnWidth(column, width) {
        this.set(`_columns.${column.index}.width`, width);
        this.reactToResize();
    }

    _getSlotName(index) {
        return `column-${index}`;
    }

    _getCellStyle(index, width, internal, isHeader) {
        const column = this._columns[index];
        const style = [];

        if (!column) {
            return '';
        }

        if (column.width) {
            style.push(`width: ${column.width}px`);
        }
        else if (column._calculatedWidth) {
            style.push(`flex: 1 1 ${column._calculatedWidth}px`);
        }
        if(!isHeader) {
            style.push(`justify-content: ${column.justify}`);
            switch (column.justify) {
                case 'end':
                case 'flex-end':
                case 'right': {
                    style.push('text-align: end')
                    break;
                }
    
                case 'start':
                case 'flex-start':
                case 'left': {
                    style.push('text-align: start')
                    break;
                }
    
                case 'center':
                    {
                        style.push('text-align: center;')
                        break;
                    }
            }
        }
        
        if (column.fixed) {
            const left = column.index === 0 ? '0' : this._columns[column.index - 1].width + 'px';
            style.push(`left: ${left}`);
        }

        return style.join(';');
    }

    async beforeSelect(model) {
        return true;
    }

    _itemSelected(item, selectedList) {
        return this.multiSelect && selectedList.filter(x => x == item).length > 0;
    }

    async _onRowClick(event) {
        const res = await this.beforeSelect(event.model.row);
        if (!res) {
            return false;
        }


        // проверка, что выделенный элемент присутствует в списке видимых данных
        // необходимо при инлайн удалении строки
        if (event.model.row && this._vdata.includes(event.model.row)) {
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

    _getRowMargin(row, index) {
        if (index === 0 && (this.tree)) {
            return `margin-left: ${row._level * 16 + 'px'}`;
        }
        return 'display:none;';
    }

    _getTreeIcon(row) {
        if (!row._haschildren) {
            return '';
        }

        return row._opened ? 'triangle-down' : 'triangle-right';
    }

    _selectedObserver(val, old, mutation) {
        if (!val) {
            return;
        }

        if (this.tree) {
            const parents = [];

            while (val._pitem != null) {
                val = val._pitem;
                parents.push(val);
            }

            parents.reverse().forEach((el) => {
                if (!el._opened) {
                    const idx = this.data.indexOf(el);
                    this.set(`data.${idx}._opened`, true);
                }
            })
        }

        if (mutation.path != 'selected') {
            this.forwardNotify(mutation, `selected`, `data.${this.data.indexOf(this.selected)}`);
        }
    }
    _treeModeChange() {
        if (this.data.control && this.tree) {
            this.data.control.treeMode = {
                hidValue: undefined,
                keyField: this.keyField,
                hidField: this.pkeyField,
                filterByHid: true
            };
        } else if (this.data.control) {
            delete this.data.control.treeMode;
        }
    }

    _onSelect(event) {
        let idx = this.selectedList.indexOf(event.model.row);
        if(idx == -1) {
            this.push('selectedList', event.model.row);
        } else {
            this.splice('selectedList', idx, 1);
        }
    }

    getTemplateForCell(tree, multiSelect, index) {
        if(index !== 0) {
            return undefined;
        }
        if(!this.tree && !this.multiSelect) {
            return undefined;
        }

        if(this.tree && !this.multiSelect) {
            return new Template(PlGrid.treeFirstCellTemplate);
        }

        if(!this.tree && this.multiSelect) {
            return new Template(PlGrid.checkboxCellTemplate);
        }

        if(this.tree && this.multiSelect) {
            return new Template(PlGrid.treeFirstCellTemplate + PlGrid.checkboxCellTemplate);
        }
    }

    _getFooterTemplate(_hasFooter) {
        return _hasFooter ? PlGrid.footerTemplate : undefined;
    }

    _isPlaceholder(row) {
        return row instanceof PlaceHolder;
    }
}

customElements.define('pl-grid', PlGrid);