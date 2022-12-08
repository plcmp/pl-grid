import { PlElement, html, css } from "polylib";
import "@plcmp/pl-icon";
import "@plcmp/pl-iconset-default";
import { throttle } from "@plcmp/utils";
import dayjs from 'dayjs/esm/index.js';

class PlGridColumn extends PlElement {
    static properties = {
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
        titleField: {
            type: String
        },
        justify: {
            type: String,
            value: 'left'
        },
        hidden: {
            type: Boolean,
            observer: '_columnHiddenObserver'
        },
        kind: {
            type: String
        },
        format: {
            type: String
        },
        resizable: {
            type: Boolean,
            reflectToAttribute: true
        },
        sortable: {
            type: Boolean
        },
        _calculatedWidth: {
            type: String
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
        },
        _footerTemplate: {
            type: Object
        }
    }

    static css = css`
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
            height: 100%;
            min-width: 1px;
            max-width: 100%;
            flex-shrink: 0;
        }

        :host ::slotted(*) {
            width: 16px;
            height: 16px;
        }

        .header {
            width: 100%;
            height: 100%;
            padding: var(--space-sm);
            box-sizing: border-box;
            display: flex;
            align-items: center;
        }

        .header-text {
            white-space: var(--pl-grid-header-white-space, nowrap);
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
        }

        :host([resizable]) .column-resizer {
            cursor: ew-resize;
            height: 50%;
            border-right: 1px solid var(--grey-dark);
            right: 0;
            position: absolute;
            width: 4px;
        }

        :host([resizable]) .column-resizer:hover  {
            border-right: 2px solid var(--primary-base);
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
            <span hidden$="[[!sortable]]" class="column-sort" on-click="[[_onSortClick]]">
                <pl-icon iconset="pl-grid-icons" size="16" icon="[[_getSortIcon(sort)]]"></pl-icon>
            </span>
            <span class="column-resizer" on-mousedown="[[onResize]]"></span>
        </div>
    `;

    connectedCallback() {
        super.connectedCallback();
        let tplEls = [...this.childNodes].filter(n => n.nodeType === document.COMMENT_NODE && n.textContent.startsWith('tpl:'));
        let footerTpl = tplEls.find(tplEl => tplEl._tpl.tpl.getAttribute('is') == 'footer');
        if(footerTpl) {
            this._footerTemplate = footerTpl?._tpl;
            this._footerTemplate._hctx = [...footerTpl._hctx, this];
        }
        let cellTpl = tplEls.find(tplEl => !tplEl._tpl.tpl.hasAttribute('is'));
        if(cellTpl) {
            this._cellTemplate = cellTpl?._tpl;
            this._cellTemplate._hctx = [...cellTpl._hctx, this];
        }
        else {
            this._cellTemplate = html`<span title$="[[_getTitle(row, field, kind, format, titleField)]]">[[_getValue(row, field, kind, format)]]</span>`;
            this._cellTemplate._hctx = [this];
        }
    }

    onResize(event) {
        if(!this.resizable) return;
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

    _onSortClick() {
        if (!this.sort) {
            this.sort = 'asc';
        } else if (this.sort === 'asc') {
            this.sort = 'desc';
        }
        else {
            this.sort = '';
        }
    }
    sortChanged() {
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
    _columnHiddenObserver(val) {
        this.dispatchEvent(new CustomEvent('column-attribute-change', {
            detail: {
                attribute: 'hidden',
                index: this._index,
                value: val
            },
            bubbles: true
        }));

    }
    _getTitle(row, field, kind, format, titleField) {
        if (row) {
            if(titleField) {
                return row[titleField];
            }
            else {
                return this._getValue(row, field, kind, format);
            }
        }
    }

    _getValue(row, field, kind, format) {
        if (row) {
            if (kind === 'date' && row[field]) {
                return dayjs(row[field]).format(format || 'DD.MM.YYYY');
            }
            return row[field];
        }
    }
}

customElements.define('pl-grid-column', PlGridColumn);
