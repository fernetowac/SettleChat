import React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { useSnackbar, SnackbarMessage, OptionsObject, VariantType } from 'notistack';
import { Notification, NotificationType } from '../types/notificationTypes';
import { NotificationKnownAction } from '../types/notificationActionTypes';
import { removeNotification } from '../actions/notificationActions';
import { ApplicationState } from '../store/index';
import { Button } from '@material-ui/core'

const getNotistackVariant = (type: NotificationType): VariantType => {
    switch (type) {
        case NotificationType.Error:
            return 'error'
        case NotificationType.Info:
            return 'info'
        default:
            throw Error('not implemented notification variant')
    }
}

let displayedKeys: number[] = [];

const storeDisplayed = (key: number) => {
    displayedKeys.push(key);
};

const removeDisplayed = (key: number) => {
    displayedKeys = [...displayedKeys.filter(x => key !== x)];
};

interface NotifierState {
    data: {
        notifications: Notification[]
    }
}

interface NotifierActions {
    actions: {
        removeNotification: (key: Notification['key']) => void;
    }
}

type NotifierProps = NotifierState & NotifierActions

const mapStateToProps = (state: ApplicationState): NotifierState => {
    return {
        data: {
            notifications: state.notifications
        }
    }
};

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, NotificationKnownAction>): NotifierActions => ({
    actions: {
        removeNotification: (key) => dispatch(removeNotification(key))
    }
});

const Notifier = (props: NotifierProps) => {
    const { notifications } = props.data;
    const { removeNotification } = props.actions;
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    React.useEffect(() => {
        notifications.forEach((notification) => {
            if (notification.dismissed) {
                // dismiss snackbar using notistack
                closeSnackbar(notification.key);
                return;
            }

            // do nothing if snackbar is already displayed
            if (displayedKeys.includes(notification.key)) return;

            const notificationContent: SnackbarMessage = notification.messageLines.length > 1 ?
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {
                        notification.messageLines.map((line, index) => <div key={index}>{line}</div>)
                    }
                </div> : notification.messageLines[0];

            const notificationOptions: OptionsObject = {
                key: notification.key,
                variant: getNotistackVariant(notification.type),
                onExited: (node, myKey: string | number) => {
                    // remove this snackbar from redux store
                    removeNotification(myKey as number);
                    removeDisplayed(myKey as number);
                },
                action: (notification.hasCloseButton ? (key: number) => (
                    <Button onClick={() => closeSnackbar(key)}>dismiss me</Button>
                ) : null),
                persist: notification.shouldPersist
            };

            // display snackbar using notistack
            enqueueSnackbar(
                notificationContent,
                notificationOptions
            );

            // keep track of snackbars that we've displayed
            storeDisplayed(notification.key);
        });
    }, [notifications, closeSnackbar, enqueueSnackbar, removeNotification]);

    return null;
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Notifier as any);