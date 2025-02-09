/**
 * @typedef {Object} GUIStyles
 * @property {string} errorMessage - Styles for error messages
 * @property {string} scrollbar - Styles for scrollbars
 * @property {string} tabContent - Styles for tab content
 */

/**
 * Default GUI styles
 */
export const DEFAULT_GUI_STYLES = {
    errorMessage: `
        .error-message {
            color: #ff0000 !important;
        }
        .error-message .tp-lblv_l,
        .error-message .tp-lblv_v {
            color: #ff0000 !important;
        }
    `,
    scrollbar: `
        #hydra-mini-gui::-webkit-scrollbar {
            width: 0px;
        }
    `,
    tabContent: `
        .tp-tbpv_c {
            max-height: 80vh;
            overflow-y: auto;
        }
        .tp-tbpv_c::-webkit-scrollbar {
            width: 0px;
        }
    `
}; 