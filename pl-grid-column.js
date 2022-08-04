import { PlElement, html, css } from "polylib";
import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";
import { throttle } from "@plcmp/utils";
import dayjs from 'dayjs/esm/index.js';

class PlGridColumn extends PlElement {
    static  properties = {
        header: {
            type: String
        },
        width: {
            type: Number,
            observer: '_columnWidthObserver'
        },
        minWidth: {
            type: Number,
            value: 50
        },
        field: {
            type: String
        },
        hidden: {
            type: Boolean,
            reflectToAttribute: true
        },
        kind: {
            type: String
        },
        format: {
            type: String
        },
        resizable: {
            type: Boolean
        },
        sortable: {
            type: Boolean
        },
        sort: {
            type: String,
            observer: 'sortChanged'
        },
        fixed: {
            type: Boolean
        },
        action: {
            type: Boolean
        },
        _index: {
            type: Number
        },
        _template: {
            type: Object
        },
        _cellTemplate: {
            type: Object
        }
    }

    static  css = css`
        :host{
            box-sizing: border-box;
            flex-direction: row;
            display: flex;
            min-height: var(--pl-grid-header-min-height);
            overflow: hidden;
            background: var(--grey-lightest);
            z-index: 2;
            position: sticky;
            font: var(--header-font);
            color: var(--header-color);
            will-change: width;
            padding: 0 var(--space-sm);
        }

        :host([hidden]) {
            display: none;
        }

        :host ::slotted(*) {
            width: 16px;
            height: 16px;
        }

        .header {
            display: flex;
            width: 100%;
            align-items: center;
            flex-shrink: 0;
            gap: var(--space-md);
        }

        .header-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
        }

        .column-resizer{
            cursor: ew-resize;
            height: 50%;
            border-right: 1px solid var(--grey-dark);
            right: 0;
            position: absolute;
            width: 2px;
        }

        .column-sort {
            cursor: pointer;
            color: var(--grey-dark);
        }
    `;

    static template = html`
        <div class="header">
            <slot name="prefix"></slot>
            <span class="header-text">
                [[header]]
            </span>
            <span hidden$="[[_sortableHidden(sortable)]]" class="column-sort" on-click="[[_onSortClick]]">
                <pl-icon iconset="pl-grid-icons" size="16" icon="[[_getSortIcon(sort)]]"></pl-icon>
            </span>
            <span hidden$="[[_resizableHiden(resizable)]]" class="column-resizer" on-mousedown="[[onResize]]">
            </span>
        </div>
    `;
    
    connectedCallback() {
        super.connectedCallback();
        let tplEl = [...this.childNodes].find( n => n.nodeType === document.COMMENT_NODE && n.textContent.startsWith('tpl:'));
        if (tplEl) {
            // host context can be assigned to template
            this._cellTemplate = tplEl?._tpl;
            this._cellTemplate._hctx = [...tplEl._hctx, this];
        }
        else {
            this._cellTemplate = html`[[_getValue(row, field, kind, format)]]`;
            this._cellTemplate._hctx = [this];
        }

    }

    _sortableHidden(sortable) {
        return !sortable;
    }

    _resizableHiden(resizable) {
        return !resizable;
    }

    onResize(event) {
        if (!this.width) this.width = this.offsetWidth;
        this._resizeBase = { baseSize: parseInt(this.width), baseMoveOffset: event.screenX };
        event.preventDefault();
        const moveHandler = (event) => {
            let throttler = throttle(() => {
                this.width = Math.max(this.minWidth, this._resizeBase.baseSize + (event.screenX - this._resizeBase.baseMoveOffset));
            }, 100)

            throttler();
        };
        const removeHandlers = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        const upHandler = () => {
            removeHandlers();
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    _getSortIcon() {
        let icon = 'sort';
        switch (this.sort) {
            case 'asc': {
                icon = 'sort-asc';
                break;
            }
            case 'desc': {
                icon = 'sort-desc';
                break;
            }
        }

        return icon;
    }

    _onSortClick(event) {
        if (!this.sort) {
            this.sort = 'asc';
        } else if (this.sort == 'asc') {
            this.sort = 'desc';
        }
        else {
            this.sort = '';
        }
    }
    sortChanged(v) {
        this.dispatchEvent(new CustomEvent('column-attribute-change', {
            detail: {
                attribute: 'sort',
                index: this._index,
                value: this.sort
            },
            bubbles: true
        }));
    }

    _columnWidthObserver(width) {
        this.dispatchEvent(new CustomEvent('column-attribute-change', {
            detail: {
                attribute: 'width',
                index: this._index,
                value: parseInt(width)
            },
            bubbles: true
        }));
    }

    _getValue(row, field, kind, format) {
        if (row) {
            if (kind == 'date') {
                return dayjs(row[field]).format(format || 'DD.MM.YYYY');
            }
            return row[field];
        }
    }
}

customElements.define('pl-grid-column', PlGridColumn);
