import * as React from 'react';
import { connect, useDispatch } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  MessagesStore from '../store/Messages';
import { Message } from '../store/Messages';

// At runtime, Redux will merge together...
type MessagesProps =
    MessagesStore.MessagesState // ... state we've requested from the Redux store
    & typeof MessagesStore.actionCreators; // ... plus action creators we've requested
//& RouteComponentProps<{ startDateIndex: string }>; // ... plus incoming routing parameters

const Messages = (data: MessagesProps) => {

    //const [data, setData] = React.useState(() => function () {
    //   // var aaa=initialData.requestMessages();
    //    return {
    //        messages: [] as Message[]
    //    } as MessagesProps;
    //}());
    const dispatch = useDispatch();

    React.useEffect(() => {
        console.log('useEffect called')
        data.requestMessages();
        //dispatch(MessagesStore.actionCreators.requestMessages);
    }, []);

    //return "Messages here";
    //console.log("fero data:" + JSON.stringify(data));
    return <React.Fragment>
        <h1>Messages ({data.messages.length})</h1>
        <ul>{
            (data.messages || [{ userFrom: 'dummy user', text: 'dummy text', id: '1' } as MessagesStore.Message]).map(item =>
                <li key={item.id}>({item.userFrom}: {item.text})</li>
            )
        }
        </ul>
    </React.Fragment>;
}

export default connect(
    (state: ApplicationState) => state.messages,
    MessagesStore.actionCreators
)(Messages as any);
